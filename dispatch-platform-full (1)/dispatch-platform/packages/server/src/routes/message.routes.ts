// ============================================================================
// MESSAGE ROUTES
// ============================================================================

import { SendMessageSchema, CreateConversationSchema } from '@dispatch/shared';

const messageRoutes = Router();

// POST /messages/conversations - Create conversation
messageRoutes.post(
  '/conversations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const validated = CreateConversationSchema.parse(req.body);

    // Ensure current user is a participant
    if (!validated.participants.includes(req.user!.id)) {
      validated.participants.push(req.user!.id);
    }

    const conversation = await database.queryOne(
      `INSERT INTO conversations (type, participants, load_id, title)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        validated.type,
        validated.participants,
        validated.loadId || null,
        validated.title || null,
      ]
    );

    res.status(201).json({ success: true, data: conversation });
  })
);

// GET /messages/conversations - List user's conversations
messageRoutes.get(
  '/conversations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const result = await database.query(
      `SELECT c.*, 
        (
          SELECT json_build_object(
            'id', m.id, 'content', m.content, 'type', m.type,
            'sender_id', m.sender_id, 'created_at', m.created_at,
            'is_read', m.is_read
          )
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        COALESCE((c.unread_count->>$1)::int, 0) as unread_count
       FROM conversations c
       WHERE $2 = ANY(c.participants)
       ORDER BY c.updated_at DESC`,
      [userId, userId]
    );

    res.json({ success: true, data: result.rows });
  })
);

// GET /messages/conversations/:id - Get conversation messages
messageRoutes.get(
  '/conversations/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Verify access
    const conv = await database.queryOne<{ participants: string[] }>(
      'SELECT participants FROM conversations WHERE id = $1',
      [id]
    );

    if (!conv) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    if (!conv.participants.includes(req.user!.id)) {
      throw new AppError('FORBIDDEN', 'You are not a participant in this conversation', 403);
    }

    const result = await database.query(
      `SELECT m.*, u.first_name, u.last_name, u.avatar_url
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limitNum, offset]
    );

    res.json({ success: true, data: result.rows });
  })
);

// POST /messages/conversations/:id - Send message
messageRoutes.post(
  '/conversations/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validated = SendMessageSchema.parse({ ...req.body, conversationId: id });

    // Verify access
    const conv = await database.queryOne<{ participants: string[] }>(
      'SELECT participants FROM conversations WHERE id = $1',
      [id]
    );

    if (!conv) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation not found', 404);
    if (!conv.participants.includes(req.user!.id)) {
      throw new AppError('FORBIDDEN', 'You are not a participant in this conversation', 403);
    }

    const message = await database.queryOne(
      `INSERT INTO messages (conversation_id, sender_id, type, content, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        req.user!.id,
        validated.type,
        validated.content,
        JSON.stringify(validated.attachments || []),
      ]
    );

    // Update conversation last message
    await database.query(
      'UPDATE conversations SET last_message_id = $1, updated_at = NOW() WHERE id = $2',
      [message.id, id]
    );

    // Update unread counts for other participants
    const otherParticipants = conv.participants.filter((p) => p !== req.user!.id);
    for (const participant of otherParticipants) {
      await database.query(
        `UPDATE conversations 
         SET unread_count = jsonb_set(
           COALESCE(unread_count, '{}'::jsonb),
           ARRAY[$1],
           (COALESCE((unread_count->>$1)::int, 0) + 1)::text::jsonb
         )
         WHERE id = $2`,
        [participant, id]
      );

      // Send real-time notification
      const { websocketService } = require('../services/websocket.service');
      websocketService.emitToUser(participant, 'message:received', {
        conversationId: id,
        message,
      });
    }

    res.status(201).json({ success: true, data: message });
  })
);

// POST /messages/conversations/:id/read - Mark conversation as read
messageRoutes.post(
  '/conversations/:id/read',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    await database.transaction(async (client) => {
      // Mark all messages as read
      await client.query(
        `UPDATE messages 
         SET is_read = TRUE, read_by = array_append(COALESCE(read_by, '{}'), $1::uuid)
         WHERE conversation_id = $2 AND sender_id != $1 AND is_read = FALSE`,
        [userId, id]
      );

      // Reset unread count
      await client.query(
        `UPDATE conversations 
         SET unread_count = jsonb_set(COALESCE(unread_count, '{}'::jsonb), ARRAY[$1], '0'::jsonb)
         WHERE id = $2`,
        [userId, id]
      );
    });

    res.json({ success: true, message: 'Marked as read' });
  })
);

export { messageRoutes };

// ============================================================================
// NOTIFICATION ROUTES
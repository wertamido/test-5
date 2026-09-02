/**
 * Internationalization (i18n) Configuration
 * Supports 20 languages with fallback to English
 */

import { type Language } from '@dispatch/shared';

// ─── Translation Dictionaries ──────────────────────────────────────────────────

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'common.appName': 'FreightDispatch',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.done': 'Done',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.refresh': 'Refresh',
    'common.settings': 'Settings',
    'common.logout': 'Logout',
    'common.login': 'Login',
    'common.register': 'Register',
    'common.submit': 'Submit',
    'common.send': 'Send',
    'common.view_all': 'View All',
    'common.no_results': 'No results found',
    'common.pull_to_refresh': 'Pull to refresh',

    // Auth
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    'auth.forgot_password': 'Forgot Password?',
    'auth.reset_password': 'Reset Password',
    'auth.login_title': 'Welcome Back',
    'auth.login_subtitle': 'Sign in to continue',
    'auth.register_title': 'Create Account',
    'auth.register_subtitle': 'Join thousands of drivers and shippers',
    'auth.company_name': 'Company Name',
    'auth.phone': 'Phone Number',
    'auth.first_name': 'First Name',
    'auth.last_name': 'Last Name',
    'auth.role': 'I am a...',
    'auth.role_carrier': 'Trucker / Carrier',
    'auth.role_shipper': 'Shipper / Client',
    'auth.terms': 'By continuing, you agree to our Terms & Privacy Policy',
    'auth.have_account': 'Already have an account?',
    'auth.no_account': "Don't have an account?",
    'auth.verify_email': 'Verify your email',
    'auth.verify_phone': 'Verify your phone',
    'auth.2fa_setup': 'Set up two-factor authentication',
    'auth.2fa_code': 'Enter 6-digit code',
    'auth.session_expired': 'Your session has expired. Please login again.',

    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.active_trip': 'Active Trip',
    'nav.messages': 'Messages',
    'nav.account': 'Account',

    // Home
    'home.greeting': 'Hello',
    'home.available_loads': 'Available Loads',
    'home.near_you': 'Near You',
    'home.recent_trips': 'Recent Trips',
    'home.earnings': 'Earnings',
    'home.this_week': 'This Week',
    'home.this_month': 'This Month',
    'home.total': 'Total',
    'home.view_map': 'View Map',

    // Loads
    'loads.title': 'Loads',
    'loads.search_placeholder': 'Search by city, state, or ZIP',
    'loads.filter_status': 'Status',
    'loads.filter_price': 'Price Range',
    'loads.filter_distance': 'Distance',
    'loads.filter_equipment': 'Equipment Type',
    'loads.origin': 'Origin',
    'loads.destination': 'Destination',
    'loads.pickup': 'Pickup',
    'loads.delivery': 'Delivery',
    'loads.weight': 'Weight',
    'loads.distance': 'Distance',
    'loads.rate': 'Rate',
    'loads.bid_now': 'Bid Now',
    'loads.view_details': 'View Details',
    'loads.no_loads': 'No loads available',
    'loads.create_load': 'Post a Load',
    'loads.save': 'Save',
    'loads.saved': 'Saved',

    // Bids
    'bids.title': 'Bids',
    'bids.place_bid': 'Place Bid',
    'bids.your_bid': 'Your Bid',
    'bids.counter_offer': 'Counter Offer',
    'bids.accepted': 'Accepted',
    'bids.rejected': 'Rejected',
    'bids.pending': 'Pending',
    'bids.withdrawn': 'Withdrawn',
    'bids.no_bids': 'No bids yet',

    // Trips
    'trips.title': 'Trips',
    'trips.active': 'Active',
    'trips.completed': 'Completed',
    'trips.upcoming': 'Upcoming',
    'trips.start_trip': 'Start Trip',
    'trips.arrive_pickup': 'Arrived at Pickup',
    'trips.confirm_pickup': 'Confirm Pickup',
    'trips.arrive_delivery': 'Arrived at Delivery',
    'trips.confirm_delivery': 'Confirm Delivery',
    'trips.upload_bol': 'Upload BOL',
    'trips.upload_pod': 'Upload POD',
    'trips.add_expense': 'Add Expense',
    'trips.report_issue': 'Report Issue',
    'trips.timeline': 'Timeline',

    // Chat
    'chat.title': 'Messages',
    'chat.type_message': 'Type a message...',
    'chat.no_messages': 'No messages yet',
    'chat.send': 'Send',
    'chat.typing': 'Typing...',
    'chat.online': 'Online',
    'chat.offline': 'Offline',

    // Payments
    'payments.title': 'Payments',
    'payments.earnings': 'Earnings',
    'payments.pending': 'Pending',
    'payments.available': 'Available',
    'payments.escrow': 'In Escrow',
    'payments.request_payout': 'Request Payout',
    'payments.payment_methods': 'Payment Methods',
    'payments.add_method': 'Add Payment Method',
    'payments.invoices': 'Invoices',
    'payments.payout_success': 'Payout requested successfully',

    // Profile
    'profile.title': 'Profile',
    'profile.edit': 'Edit Profile',
    'profile.documents': 'Documents',
    'profile.vehicles': 'Vehicles',
    'profile.rating': 'Rating',
    'profile.reviews': 'Reviews',
    'profile.verification': 'Verification Status',
    'profile.verified': 'Verified',
    'profile.unverified': 'Unverified',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.push_notifications': 'Push Notifications',
    'settings.sound': 'Sound',
    'settings.haptic': 'Haptic Feedback',
    'settings.biometric': 'Biometric Login',
    'settings.about': 'About',
    'settings.privacy': 'Privacy Policy',
    'settings.terms': 'Terms of Service',
    'settings.version': 'Version',

    // Notifications
    'notifications.title': 'Notifications',
    'notifications.no_notifications': 'No notifications',
    'notifications.mark_all_read': 'Mark all as read',

    // Errors
    'errors.network': 'Network error. Please check your connection.',
    'errors.unauthorized': 'Unauthorized. Please login again.',
    'errors.not_found': 'Not found',
    'errors.server': 'Server error. Please try again later.',
    'errors.validation': 'Please check your input',
    'errors.timeout': 'Request timed out. Please try again.',
  },

  fr: {
    'common.appName': 'FreightDispatch',
    'common.loading': 'Chargement...',
    'common.error': 'Quelque chose s\'est mal passé',
    'common.retry': 'Réessayer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.done': 'Terminé',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'common.refresh': 'Actualiser',
    'common.settings': 'Paramètres',
    'common.logout': 'Déconnexion',
    'common.login': 'Connexion',
    'common.register': 'S\'inscrire',
    'common.submit': 'Soumettre',
    'common.send': 'Envoyer',
    'common.view_all': 'Tout voir',
    'common.no_results': 'Aucun résultat trouvé',
    'common.pull_to_refresh': 'Tirer pour actualiser',

    'auth.email': 'E-mail',
    'auth.password': 'Mot de passe',
    'auth.confirm_password': 'Confirmer le mot de passe',
    'auth.forgot_password': 'Mot de passe oublié ?',
    'auth.reset_password': 'Réinitialiser le mot de passe',
    'auth.login_title': 'Bon retour',
    'auth.login_subtitle': 'Connectez-vous pour continuer',
    'auth.register_title': 'Créer un compte',
    'auth.register_subtitle': 'Rejoignez des milliers de conducteurs et expéditeurs',
    'auth.company_name': 'Nom de l\'entreprise',
    'auth.phone': 'Numéro de téléphone',
    'auth.first_name': 'Prénom',
    'auth.last_name': 'Nom de famille',
    'auth.role': 'Je suis un...',
    'auth.role_carrier': 'Camionneur / Transporteur',
    'auth.role_shipper': 'Expéditeur / Client',
    'auth.terms': 'En continuant, vous acceptez nos Conditions et Politique de confidentialité',
    'auth.have_account': 'Vous avez déjà un compte ?',
    'auth.no_account': 'Vous n\'avez pas de compte ?',

    'nav.home': 'Accueil',
    'nav.search': 'Recherche',
    'nav.active_trip': 'Trajet actif',
    'nav.messages': 'Messages',
    'nav.account': 'Compte',

    'home.greeting': 'Bonjour',
    'home.available_loads': 'Chargements disponibles',
    'home.near_you': 'Près de chez vous',
    'home.recent_trips': 'Trajets récents',
    'home.earnings': 'Gains',
    'home.this_week': 'Cette semaine',
    'home.this_month': 'Ce mois',
    'home.total': 'Total',

    'loads.title': 'Chargements',
    'loads.search_placeholder': 'Rechercher par ville, état ou code postal',
    'loads.origin': 'Origine',
    'loads.destination': 'Destination',
    'loads.pickup': 'Ramassage',
    'loads.delivery': 'Livraison',
    'loads.weight': 'Poids',
    'loads.distance': 'Distance',
    'loads.rate': 'Tarif',
    'loads.bid_now': 'Enchérir maintenant',
    'loads.view_details': 'Voir les détails',
    'loads.no_loads': 'Aucun chargement disponible',
    'loads.create_load': 'Publier un chargement',
    'loads.save': 'Enregistrer',
    'loads.saved': 'Enregistré',

    'bids.title': 'Enchères',
    'bids.place_bid': 'Placer une enchère',
    'bids.your_bid': 'Votre enchère',
    'bids.accepted': 'Acceptée',
    'bids.rejected': 'Rejetée',
    'bids.pending': 'En attente',
    'bids.no_bids': 'Aucune enchère pour le moment',

    'trips.title': 'Trajets',
    'trips.active': 'Actif',
    'trips.completed': 'Terminé',
    'trips.start_trip': 'Commencer le trajet',
    'trips.confirm_pickup': 'Confirmer le ramassage',
    'trips.confirm_delivery': 'Confirmer la livraison',
    'trips.timeline': 'Chronologie',

    'chat.title': 'Messages',
    'chat.type_message': 'Tapez un message...',
    'chat.send': 'Envoyer',

    'payments.title': 'Paiements',
    'payments.earnings': 'Gains',
    'payments.request_payout': 'Demander un paiement',

    'profile.title': 'Profil',
    'profile.edit': 'Modifier le profil',
    'profile.documents': 'Documents',
    'profile.vehicles': 'Véhicules',
    'profile.rating': 'Évaluation',

    'settings.title': 'Paramètres',
    'settings.language': 'Langue',
    'settings.theme': 'Thème',
    'settings.notifications': 'Notifications',

    'notifications.title': 'Notifications',
    'notifications.no_notifications': 'Aucune notification',

    'errors.network': 'Erreur réseau. Veuillez vérifier votre connexion.',
    'errors.unauthorized': 'Non autorisé. Veuillez vous reconnecter.',
    'errors.server': 'Erreur serveur. Veuillez réessayer plus tard.',
  },

  es: {
    'common.appName': 'FreightDispatch',
    'common.loading': 'Cargando...',
    'common.error': 'Algo salió mal',
    'common.retry': 'Reintentar',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.close': 'Cerrar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.done': 'Hecho',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.sort': 'Ordenar',
    'common.refresh': 'Actualizar',
    'common.settings': 'Configuración',
    'common.logout': 'Cerrar sesión',
    'common.login': 'Iniciar sesión',
    'common.register': 'Registrarse',
    'common.submit': 'Enviar',
    'common.send': 'Enviar',
    'common.view_all': 'Ver todo',
    'common.no_results': 'No se encontraron resultados',
    'common.pull_to_refresh': 'Desliza para actualizar',

    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.confirm_password': 'Confirmar contraseña',
    'auth.forgot_password': '¿Olvidaste tu contraseña?',
    'auth.login_title': 'Bienvenido de nuevo',
    'auth.login_subtitle': 'Inicia sesión para continuar',
    'auth.register_title': 'Crear cuenta',
    'auth.register_subtitle': 'Únete a miles de conductores y remitentes',
    'auth.company_name': 'Nombre de la empresa',
    'auth.phone': 'Número de teléfono',
    'auth.first_name': 'Nombre',
    'auth.last_name': 'Apellido',
    'auth.role': 'Soy un...',
    'auth.role_carrier': 'Conductor / Transportista',
    'auth.role_shipper': 'Remitente / Cliente',

    'nav.home': 'Inicio',
    'nav.search': 'Buscar',
    'nav.active_trip': 'Viaje activo',
    'nav.messages': 'Mensajes',
    'nav.account': 'Cuenta',

    'home.greeting': 'Hola',
    'home.available_loads': 'Cargas disponibles',
    'home.earnings': 'Ganancias',
    'home.this_week': 'Esta semana',
    'home.this_month': 'Este mes',
    'home.total': 'Total',

    'loads.title': 'Cargas',
    'loads.search_placeholder': 'Buscar por ciudad, estado o código postal',
    'loads.origin': 'Origen',
    'loads.destination': 'Destino',
    'loads.pickup': 'Recogida',
    'loads.delivery': 'Entrega',
    'loads.weight': 'Peso',
    'loads.distance': 'Distancia',
    'loads.rate': 'Tarifa',
    'loads.bid_now': 'Ofertar ahora',
    'loads.view_details': 'Ver detalles',
    'loads.no_loads': 'No hay cargas disponibles',
    'loads.create_load': 'Publicar una carga',

    'bids.title': 'Ofertas',
    'bids.place_bid': 'Hacer oferta',
    'bids.your_bid': 'Tu oferta',
    'bids.accepted': 'Aceptada',
    'bids.rejected': 'Rechazada',
    'bids.pending': 'Pendiente',

    'trips.title': 'Viajes',
    'trips.active': 'Activo',
    'trips.completed': 'Completado',
    'trips.start_trip': 'Iniciar viaje',
    'trips.confirm_pickup': 'Confirmar recogida',
    'trips.confirm_delivery': 'Confirmar entrega',

    'chat.title': 'Mensajes',
    'chat.type_message': 'Escribe un mensaje...',
    'chat.send': 'Enviar',

    'payments.title': 'Pagos',
    'payments.earnings': 'Ganancias',
    'payments.request_payout': 'Solicitar pago',

    'profile.title': 'Perfil',
    'profile.edit': 'Editar perfil',
    'profile.documents': 'Documentos',
    'profile.vehicles': 'Vehículos',

    'settings.title': 'Configuración',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.notifications': 'Notificaciones',

    'errors.network': 'Error de red. Por favor verifica tu conexión.',
    'errors.unauthorized': 'No autorizado. Por favor inicia sesión de nuevo.',
    'errors.server': 'Error del servidor. Por favor intenta más tarde.',
  },

  // Other languages use English fallback for missing keys
  ar: {},
  zh: {},
  de: {},
  hi: {},
  ja: {},
  ko: {},
  pt: {},
  ru: {},
  it: {},
  nl: {},
  tr: {},
  pl: {},
  vi: {},
  th: {},
  id: {},
  sv: {},
  da: {},
  no: {},
  fi: {},
};

// ─── i18n Class ────────────────────────────────────────────────────────────────

class I18n {
  private currentLanguage: Language = 'en';
  private fallbackLanguage: Language = 'en';

  setLanguage(lang: Language) {
    this.currentLanguage = lang;
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  t(key: string, params?: Record<string, string | number>): string {
    let value =
      translations[this.currentLanguage]?.[key] ||
      translations[this.fallbackLanguage]?.[key] ||
      key;

    // Interpolate parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{{${paramKey}}}`, String(paramValue));
      });
    }

    return value;
  }

  // Get available languages
  getAvailableLanguages(): Array<{ code: Language; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'ar', name: 'العربية' },
      { code: 'zh', name: '中文' },
      { code: 'de', name: 'Deutsch' },
      { code: 'hi', name: 'हिन्दी' },
      { code: 'ja', name: '日本語' },
      { code: 'ko', name: '한국어' },
      { code: 'pt', name: 'Português' },
      { code: 'ru', name: 'Русский' },
      { code: 'it', name: 'Italiano' },
      { code: 'nl', name: 'Nederlands' },
      { code: 'tr', name: 'Türkçe' },
      { code: 'pl', name: 'Polski' },
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'th', name: 'ไทย' },
      { code: 'id', name: 'Bahasa Indonesia' },
      { code: 'sv', name: 'Svenska' },
      { code: 'da', name: 'Dansk' },
    ];
  }

  // Check if language is RTL
  isRTL(lang?: Language): boolean {
    const checkLang = lang || this.currentLanguage;
    return ['ar', 'he', 'fa', 'ur'].includes(checkLang);
  }
}

export const i18n = new I18n();
export default i18n;

// ─── React Hook ───────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../store';

export const useI18n = () => {
  const language = useAppSelector((state) => state.app.language);

  return {
    t: (key: string, params?: Record<string, string | number>) =>
      i18n.t(key, params),
    language,
    setLanguage: (lang: Language) => i18n.setLanguage(lang),
    isRTL: i18n.isRTL(language),
    availableLanguages: i18n.getAvailableLanguages(),
  };
};

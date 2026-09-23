// ============================================================
// 🔔 إشعارات سطح المكتب — غرفة عمليات واصل نالوت (CRON-R9)
// تنبيهات النظام عند توفر التطبيق بالخلفية: الفرص الضائعة،
// توريد العهدة، صرف المستحقات، الكاش باك — كلها مالية حية.
// متوافق مع المتصفحات التي لا تدعم Notification (تتراجع بهدوء).
// ============================================================

export type DesktopNotifSupport = 'unsupported' | 'default' | 'granted' | 'denied'

/// حالة الدعم والصلاحية الحالية (آمن داخل الخادم — يرجع unsupported)
export function getDesktopNotifSupport(): DesktopNotifSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  const p = Notification.permission
  if (p === 'granted') return 'granted'
  if (p === 'denied') return 'denied'
  return 'default'
}

/// طلب صلاحية الإشعارات (يجب أن يكون من حدث مستخدم مباشر)
export async function requestDesktopNotifPermission(): Promise<DesktopNotifSupport> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    const p = await Notification.requestPermission()
    if (p === 'granted') return 'granted'
    if (p === 'denied') return 'denied'
    return 'default'
  } catch {
    return getDesktopNotifSupport()
  }
}

/// إظهار إشعار سطح المكتب — يتجاهل بهدوء إن لم تُمنح الصلاحية
export function showDesktopNotification(
  title: string,
  body: string,
  tag?: string,
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag: tag ?? `wasel-${Date.now()}`,
      icon: '/logo.svg',
      badge: '/logo.svg',
      dir: 'rtl',
      lang: 'ar',
    })
    // نقر الإشعار يرفع النافذة ويعيد التركيز إلى غرفة العمليات
    n.onclick = () => {
      try {
        window.focus()
        n.close()
      } catch {
        /* لا شيء */
      }
    }
  } catch {
    /* بعض المتصفحات تتطلب ServiceWorker — نتجاهل بهدوء */
  }
}

/// مفتاح تفضيل الإشعارات في التخزين المحلي
export const NOTIF_PREF_KEY = 'wasel-admin-desktop-notif'

export function readNotifPref(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(NOTIF_PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function writeNotifPref(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NOTIF_PREF_KEY, on ? '1' : '0')
  } catch {
    /* لا شيء */
  }
}

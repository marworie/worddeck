// api.js
// tüm api isteklerinin geçtiği tek nokta
// tokenı ekler, hataları uygulamaya bildirir, oturum düşünce haber verir

function notify(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  let response
  try {
    response = await fetch(url, { ...options, headers })
  } catch (err) {
    notify('api-error', 'Sunucuya ulaşılamadı. Bağlantını kontrol et.')
    throw err
  }

  // 401: token yok ya da süresi dolmuşapp kullanıcıyı giriş ekranına göndersin
  if (response.status === 401 && token) {
    notify('auth-expired')
  }

  // 500 ve üstü: sunucu hatası
  if (response.status >= 500) {
    const body = await response.clone().json().catch(() => null)
    notify('api-error', body?.message ?? 'Sunucuda bir hata oluştu.')
  }

  // 400+: doğrulama hatası -> ilk mesajı göster
  if (response.status === 400) {
    const body = await response.clone().json().catch(() => null)
    if (body?.errors) {
      notify('api-error', Object.values(body.errors).flat()[0])
    }
  }

  return response
}
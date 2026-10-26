export default function handler(req, res) {
  const { salonId } = req.query;
  if (!salonId) {
    res.status(400).json({ error: 'salonId required' });
    return;
  }
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({
    name: 'Reservas Online',
    short_name: 'Reservas',
    description: 'Reserva tu cita online',
    start_url: `/reservar/${salonId}`,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#d946ef',
    orientation: 'portrait',
    lang: 'es',
    scope: '/',
    icons: [
      { src: '/NAIQO_Logo_Magenta_Transparent.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/NAIQO_Logo_Magenta_Transparent.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['lifestyle', 'health'],
  });
}

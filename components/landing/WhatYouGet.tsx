export function WhatYouGet() {
  const categories = [
    {
      icon: '🤖',
      title: 'Compatibilité ATS',
      checks: ['Sections essentielles', 'Formatage lisible', 'Cohérence des dates'],
      color: 'blue',
    },
    {
      icon: '✍️',
      title: 'Contenu & Impact',
      checks: ["Chiffres & résultats", "Verbes d'action", 'Clichés à éviter', 'Répétitions'],
      color: 'purple',
    },
    {
      icon: '🎨',
      title: 'Style & Format',
      checks: ['Longueur adaptée', 'Coordonnées complètes', 'Cohérence verbale'],
      color: 'green',
    },
    {
      icon: '🎯',
      title: 'Impact global',
      checks: ['Sections les plus faibles', 'Évaluation globale'],
      color: 'orange',
    },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Ce que tu obtiens</span>
          <h2 className="text-3xl font-bold text-gray-900">12 checks répartis en 4 catégories</h2>
          <p className="text-gray-500">Un diagnostic complet de ton CV sous tous les angles.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map((cat) => (
            <div key={cat.title} className="bg-gray-50 rounded-2xl p-5 space-y-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${colorMap[cat.color]}`}>
                <span>{cat.icon}</span>
                <span>{cat.title}</span>
              </div>
              <ul className="space-y-1">
                {cat.checks.map((check) => (
                  <li key={check} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-300">—</span>
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-gray-700">Aperçu gratuit</p>
              <ul className="space-y-1 text-gray-500">
                <li>✓ Score /100</li>
                <li>✓ Niveau (Passable / Bon / Excellent)</li>
                <li>✓ 2 checks détaillés</li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-blue-700">Rapport complet — 5€</p>
              <ul className="space-y-1 text-gray-600">
                <li>✓ Score /100</li>
                <li>✓ 12 checks détaillés</li>
                <li>✓ 3 actions prioritaires</li>
                <li>✓ Envoi par email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

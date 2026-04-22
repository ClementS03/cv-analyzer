export function HowItWorks() {
  const steps = [
    {
      number: '1',
      icon: '📄',
      title: 'Upload ton CV',
      desc: 'Glisse ton fichier PDF ou clique pour le sélectionner. Max 5MB.',
    },
    {
      number: '2',
      icon: '🤖',
      title: "L'IA analyse en 30s",
      desc: '12 critères vérifiés : compatibilité ATS, contenu, style et impact global.',
    },
    {
      number: '3',
      icon: '📊',
      title: 'Reçois ton rapport',
      desc: 'Score /100, niveau, et 3 actions prioritaires personnalisées pour ton CV.',
    },
  ]

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Comment ça marche</span>
          <h2 className="text-3xl font-bold text-gray-900">Simple. Rapide. Actionnable.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="relative bg-white rounded-2xl p-6 shadow-sm space-y-3">
              <div className="absolute -top-3 -left-3 w-7 h-7 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {step.number}
              </div>
              <div className="text-3xl">{step.icon}</div>
              <h3 className="font-semibold text-gray-800">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">
          Aperçu gratuit · Rapport complet disponible après paiement de 5€
        </p>
      </div>
    </section>
  )
}

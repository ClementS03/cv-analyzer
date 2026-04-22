export function Pricing() {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Tarif</span>
          <h2 className="text-3xl font-bold text-gray-900">Simple et transparent</h2>
          <p className="text-gray-500">Pas d&apos;abonnement. Pas de compte. Tu paies une fois, tu reçois ton rapport.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Aperçu</p>
              <p className="text-4xl font-bold text-gray-900 mt-1">Gratuit</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex gap-2"><span className="text-green-500">✓</span> Score /100</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> Niveau global</li>
              <li className="flex gap-2"><span className="text-green-500">✓</span> 2 checks détaillés</li>
              <li className="flex gap-2"><span className="text-gray-300">✗</span> <span className="text-gray-400">Actions prioritaires</span></li>
              <li className="flex gap-2"><span className="text-gray-300">✗</span> <span className="text-gray-400">12 checks complets</span></li>
              <li className="flex gap-2"><span className="text-gray-300">✗</span> <span className="text-gray-400">Envoi par email</span></li>
            </ul>
            <p className="text-xs text-gray-400">Disponible immédiatement après upload</p>
          </div>

          <div className="bg-blue-600 rounded-2xl p-6 text-white space-y-4 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
              Recommandé
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-200 uppercase tracking-wide">Rapport complet</p>
              <div className="flex items-baseline gap-1 mt-1">
                <p className="text-4xl font-bold">5€</p>
                <p className="text-blue-300 text-sm">une fois</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-blue-300">✓</span> Score /100</li>
              <li className="flex gap-2"><span className="text-blue-300">✓</span> Niveau global</li>
              <li className="flex gap-2"><span className="text-blue-300">✓</span> 12 checks détaillés</li>
              <li className="flex gap-2"><span className="text-blue-300">✓</span> 3 actions prioritaires</li>
              <li className="flex gap-2"><span className="text-blue-300">✓</span> Envoi par email</li>
            </ul>
            <p className="text-xs text-blue-300">Paiement sécurisé par Stripe</p>
          </div>
        </div>

        <div className="text-center">
          <a
            href="#upload"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Analyser mon CV — c&apos;est gratuit →
          </a>
        </div>
      </div>
    </section>
  )
}

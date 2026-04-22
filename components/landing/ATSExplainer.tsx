export function ATSExplainer() {
  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Le problème</span>
          <h2 className="text-3xl font-bold text-gray-900">C&apos;est quoi un ATS ?</h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Un <strong>ATS (Applicant Tracking System)</strong> est un logiciel utilisé par 99% des grandes entreprises pour trier automatiquement les CV avant qu&apos;un humain ne les lise.
          </p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center space-y-2">
          <div className="text-6xl font-bold text-red-500">75%</div>
          <p className="text-gray-700 font-medium">des CV sont éliminés automatiquement</p>
          <p className="text-gray-400 text-sm">avant d&apos;atteindre les yeux d&apos;un recruteur</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📊', title: 'Formatage complexe', desc: 'Tableaux, colonnes multiples et images textuelles bloquent les ATS.' },
            { icon: '🔑', title: 'Mots-clés manquants', desc: "L'ATS cherche des termes précis liés au poste — si tu ne les as pas, tu es éliminé." },
            { icon: '📋', title: 'Sections absentes', desc: 'Contact, Expérience, Formation, Compétences — les 4 sections obligatoires.' },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-xl p-5 space-y-2">
              <div className="text-2xl">{item.icon}</div>
              <h3 className="font-semibold text-gray-800 text-sm">{item.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

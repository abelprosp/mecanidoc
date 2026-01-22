import React from 'react';
import { 
  Package, TrendingUp, DollarSign, PlusCircle, List, BarChart2 
} from 'lucide-react';

export default function SupplierDashboard() {
  return (
    <div className="flex h-screen bg-[#F1F1F1]">
      <aside className="w-64 bg-white shadow-lg hidden md:flex flex-col">
        <div className="p-6 border-b">
          <span className="text-xl font-bold text-gray-800">Fournisseur</span>
          <span className="text-xs block text-gray-400 mt-1">Espace Partenaire</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium">
            <TrendingUp size={20} /> Tableau de bord
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Package size={20} /> Mes Produits
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <List size={20} /> Gestion des stocks
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <DollarSign size={20} /> Ventes & Revenus
          </a>
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Vue d'ensemble</h1>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
            <PlusCircle size={16} /> Ajouter un produit
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Ventes du mois</h3>
            <p className="text-3xl font-bold text-gray-800">€12,450</p>
            <span className="text-green-500 text-xs font-bold">+8% vs mois dernier</span>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Produits Actifs</h3>
            <p className="text-3xl font-bold text-gray-800">145</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium mb-2">Stock Faible</h3>
            <p className="text-3xl font-bold text-orange-500">3</p>
            <span className="text-xs text-gray-400">Articles à réapprovisionner</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Inventaire Récent</h2>
            <button className="text-blue-600 text-sm font-medium hover:underline">Voir tout</button>
          </div>
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Produit</th>
                <th className="px-6 py-3">Catégorie</th>
                <th className="px-6 py-3">Prix</th>
                <th className="px-6 py-3">Stock</th>
                <th className="px-6 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { name: "Michelin Pilot Sport 4", cat: "Moto", price: "€120.00", stock: 45, status: "En stock" },
                { name: "Pirelli Diablo", cat: "Moto", price: "€145.00", stock: 12, status: "Faible" },
                { name: "Bridgestone Battlax", cat: "Moto", price: "€115.00", stock: 0, status: "Rupture" },
              ].map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{item.name}</td>
                  <td className="px-6 py-4">{item.cat}</td>
                  <td className="px-6 py-4">{item.price}</td>
                  <td className="px-6 py-4">{item.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.status === 'En stock' ? 'bg-green-100 text-green-700' :
                      item.status === 'Faible' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

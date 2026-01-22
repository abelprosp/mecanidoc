"use client";

import React, { useState } from 'react';
import { 
  ShoppingCart, User, ChevronDown, Menu, X,
  CloudSun, Mountain, Truck, Tent, Sun, Snowflake, Car, Zap, Disc,
  Bike, Flag, Star, Map, Box, Navigation,
  Bus, Hammer, MapPin,
  Tractor, Leaf, Factory, Search, CircleDot, Warehouse
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

const navigationData = [
  {
    title: "Pneus Auto",
    columns: [
      [
        { name: "Pneus 4 Saisons", icon: CloudSun },
        { name: "Pneus 4x4/SUV", icon: Mountain },
        { name: "Pneus camionnette", icon: Truck },
      ],
      [
        { name: "Pneus camping", icon: Tent },
        { name: "Pneus été Auto", icon: Sun },
        { name: "Pneus Hiver", icon: Snowflake },
      ],
      [
        { name: "Pneus Voiture", icon: Car },
        { name: "Pneus voiture électrique", icon: Zap },
        { name: "Type-c", icon: Disc },
      ]
    ]
  },
  {
    title: "Pneu Moto",
    columns: [
      [
        { name: "Chopper / Cruiser", icon: Bike },
        { name: "Pneus circuit et piste", icon: Flag },
        { name: "Pneus cross / enduro / trial", icon: Mountain },
      ],
      [
        { name: "Pneus custom et collection", icon: Star },
        { name: "Pneus moto sport et route", icon: Disc },
        { name: "Pneus scooter", icon: CircleDot },
      ],
      [
        { name: "Pneus trail", icon: Map },
        { name: "Quad / Véhicule tout terrain", icon: Box },
        { name: "Sport Tourisme diagonal", icon: Navigation },
      ]
    ]
  },
  {
    title: "Pneus Camion",
    columns: [
      [
        { name: "Pneus autocar - autobus", icon: Bus },
        { name: "Pneus chantier", icon: Hammer },
        { name: "Pneus longue distance", icon: Map },
      ],
      [
        { name: "Pneus régionaux", icon: MapPin },
      ]
    ]
  },
  {
    title: "Pneus Agricoles",
    columns: [
      [
        { name: "Pneus avant tracteur", icon: Tractor },
        { name: "Pneus espaces verts", icon: Leaf },
        { name: "Pneus industriel et manutention", icon: Factory },
      ],
      [
        { name: "Pneus remorque agricole", icon: Warehouse }, 
        { name: "Pneus roue motrice", icon: Disc },
        { name: "Recherche par dimension", icon: Search }, 
      ]
    ]
  }
];

export default function Header() {
  const { cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-700 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Logo - Responsive Size */}
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="MecaniDoc Logo" 
            className="object-contain h-8 w-auto md:h-10 md:w-[180px]" 
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700 h-full">
          {navigationData.map((item) => (
            <div key={item.title} className="group h-full flex items-center">
              <button className="flex items-center gap-1 hover:text-blue-600 h-full border-b-2 border-transparent hover:border-blue-600 transition-colors">
                {item.title} <ChevronDown size={14} />
              </button>
              
              {/* Mega Menu */}
              <div className="absolute left-0 top-full w-full bg-white border border-gray-800 shadow-xl hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex w-full">
                  {item.columns.map((column, colIndex) => (
                    <div key={colIndex} className={`flex-1 p-6 ${colIndex !== item.columns.length - 1 ? 'border-r border-gray-800' : ''}`}>
                      <ul className="space-y-4">
                        {column.map((subItem) => (
                          <li key={subItem.name}>
                            <Link href={`/categorie/${subItem.name.toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors group/item">
                              <subItem.icon size={20} className="text-gray-500 group-hover/item:text-blue-600" />
                              <span className="text-sm font-medium">{subItem.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {item.columns.length < 3 && (
                     <div className="flex-[2]"></div> 
                  )}
                </div>
              </div>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/auth/login" className="text-gray-600 hover:text-blue-600">
            <User size={20} className="md:w-6 md:h-6" />
          </Link>
          <Link href="/checkout" className="text-gray-600 hover:text-blue-600 relative">
            <ShoppingCart size={20} className="md:w-6 md:h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-t border-gray-100 shadow-lg max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="p-4 space-y-2">
            {navigationData.map((item) => (
              <div key={item.title} className="border-b border-gray-100 last:border-0">
                <button 
                  onClick={() => setActiveMobileCategory(activeMobileCategory === item.title ? null : item.title)}
                  className="flex items-center justify-between w-full py-3 text-left font-bold text-gray-800"
                >
                  {item.title}
                  <ChevronDown size={16} className={`transform transition-transform ${activeMobileCategory === item.title ? 'rotate-180' : ''}`} />
                </button>
                
                {activeMobileCategory === item.title && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-2">
                    {item.columns.flat().map((subItem) => (
                      <Link 
                        key={subItem.name}
                        href={`/categorie/${subItem.name.toLowerCase().replace(/ \/ /g, '-').replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                        className="flex items-center gap-3 py-2 text-sm text-gray-600 hover:text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <subItem.icon size={16} />
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

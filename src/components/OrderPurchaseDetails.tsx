"use client";

import React from "react";

function euros(n: number | string | null | undefined) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return `€${v.toFixed(2)}`;
}

function deliveryLabel(type: string | null | undefined) {
  if (type === "fast") return "Livraison rapide (24–72 h)";
  if (type === "normal") return "Livraison normale (~5 j. ouvrés)";
  return type || "—";
}

function paymentLabel(status: string | null | undefined) {
  if (status === "paid") return "Payé";
  if (status === "pending") return "Paiement en attente";
  if (status === "failed") return "Échoué";
  if (status === "refunded") return "Remboursé";
  return status || "—";
}

export default function OrderPurchaseDetails({
  order,
  compact = false,
  /** Fournisseur : seules certaines lignes sont visibles ; ne pas présenter les montants comme « les vôtres ». */
  supplierView = false,
}: {
  order: any;
  /** Masque le bloc « client » si déjà affiché ailleurs (ex. tableau admin) */
  compact?: boolean;
  supplierView?: boolean;
}) {
  const items = order.order_items || [];
  const linesSubtotal = items.reduce(
    (s: number, it: any) =>
      s + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );
  const subtotal =
    order.subtotal_amount != null && !supplierView
      ? Number(order.subtotal_amount)
      : linesSubtotal;
  const delivery = Number(order.delivery_fee ?? 0);
  const warrantyFee = Number(order.warranty_fee ?? 0);
  const warrantyOn = Boolean(order.warranty_included);
  const total = Number(order.total_amount ?? 0);

  return (
    <div
      className={
        compact
          ? "text-sm space-y-3"
          : "border-t border-gray-100 bg-gray-50/90 p-4 md:p-6 text-sm space-y-4"
      }
    >
      {!compact && (
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold text-gray-800 mb-2">Client & livraison</h4>
            <ul className="text-gray-600 space-y-1">
              <li>
                <span className="text-gray-500">Contact :</span>{" "}
                {order.contact_name || order.profiles?.full_name || "—"}
              </li>
              <li>
                <span className="text-gray-500">Téléphone :</span>{" "}
                {order.contact_phone || "—"}
              </li>
              <li>
                <span className="text-gray-500">E-mail :</span>{" "}
                {order.contact_email || order.profiles?.email || "—"}
              </li>
              <li>
                <span className="text-gray-500">Adresse :</span>{" "}
                {[order.shipping_address, order.shipping_zip, order.shipping_city]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </li>
              <li>
                <span className="text-gray-500">Pays :</span>{" "}
                {order.shipping_country || "—"}
              </li>
              {order.notes ? (
                <li>
                  <span className="text-gray-500">Notes :</span> {order.notes}
                </li>
              ) : null}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-2">Paiement & statut</h4>
            <ul className="text-gray-600 space-y-1">
              <li>
                <span className="text-gray-500">Statut commande :</span>{" "}
                {order.status || "—"}
              </li>
              <li>
                <span className="text-gray-500">Paiement :</span>{" "}
                {paymentLabel(order.payment_status)}
              </li>
              <li>
                <span className="text-gray-500">Assurance / garantie :</span>{" "}
                {warrantyOn ? (
                  <>
                    Oui ({euros(warrantyFee)} sur la commande
                    {warrantyFee === 0 ? " — montant non enregistré (anciennes commandes)" : ""})
                  </>
                ) : (
                  "Non"
                )}
              </li>
              <li>
                <span className="text-gray-500">Livraison :</span>{" "}
                {deliveryLabel(order.delivery_type)} — {euros(delivery)}
              </li>
            </ul>
          </div>
        </div>
      )}

      {compact && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
          <span>
            <span className="text-gray-500">Paiement :</span>{" "}
            {paymentLabel(order.payment_status)}
          </span>
          <span>
            <span className="text-gray-500">Garantie :</span>{" "}
            {warrantyOn ? `Oui (${euros(warrantyFee)})` : "Non"}
          </span>
          <span>
            <span className="text-gray-500">Livraison :</span>{" "}
            {deliveryLabel(order.delivery_type)} ({euros(delivery)})
          </span>
        </div>
      )}

      <div>
        <h4 className="font-bold text-gray-800 mb-2">Articles (pneus)</h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-gray-100 text-gray-600 uppercase">
              <tr>
                <th className="px-3 py-2">Produit</th>
                <th className="px-3 py-2">Qté</th>
                <th className="px-3 py-2">Prix unit.</th>
                <th className="px-3 py-2">Sous-total ligne</th>
                <th className="px-3 py-2">Garage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-gray-400 text-center">
                    Aucune ligne
                  </td>
                </tr>
              ) : (
                items.map((it: any) => {
                  const name = it.products?.name || "Produit";
                  const line = Number(it.price || 0) * Number(it.quantity || 0);
                  const g = it.garages;
                  const garageLabel = g
                    ? [g.name, g.address, g.city].filter(Boolean).join(" — ")
                    : "—";
                  return (
                    <tr key={it.id} className="text-gray-700">
                      <td className="px-3 py-2 font-medium">{name}</td>
                      <td className="px-3 py-2">{it.quantity}</td>
                      <td className="px-3 py-2">{euros(it.price)}</td>
                      <td className="px-3 py-2 font-medium">{euros(line)}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate" title={garageLabel}>
                        {garageLabel}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 w-full sm:w-80 space-y-1 text-gray-700">
          {supplierView ? (
            <>
              <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1 mb-2">
                Montants livraison / garantie / total = commande complète payée par le client (pas
                uniquement vos pneus).
              </p>
              <div className="flex justify-between font-medium">
                <span className="text-gray-600">Vos lignes (CA)</span>
                <span>{euros(linesSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Frais livraison (commande)</span>
                <span>{euros(delivery)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Garantie (commande)</span>
                <span>{warrantyOn ? euros(warrantyFee) : euros(0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
                <span>Total réglé (client)</span>
                <span>{euros(total)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Sous-total pneus</span>
                <span>{euros(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Frais livraison</span>
                <span>{euros(delivery)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Garantie (commande)</span>
                <span>{warrantyOn ? euros(warrantyFee) : euros(0)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{euros(total)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

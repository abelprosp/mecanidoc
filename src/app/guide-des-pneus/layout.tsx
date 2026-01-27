import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide des Pneus - MecaniDoc",
  description: "Guide des Pneus : Questions et Réponses. Catégories, réglementation, permutation, pression, changement de roue et plus.",
};

export default function GuideDesPneusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

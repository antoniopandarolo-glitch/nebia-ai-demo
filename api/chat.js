export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata sul server.' });
  }

  try {
    const { messages } = req.body;

    // Knowledge Base aziendale simulata (equivalente a 30 pagine web + PDF cataloghi/FAQ)
    const knowledgeBase = `
=== BASE DE CONNAISSANCES INTERNE : MAISON AUVERGNE (CLERMONT-FERRAND) ===
[DOC 1 - INFOS GÉNÉRALES & HORAIRES]
- Nom : Maison Auvergne - Boulangerie, Pâtisserie & Traiteur Artisanal.
- Adresse : 14 Rue des Gras, 63000 Clermont-Ferrand.
- Horaires : Du mardi au samedi de 07h00 à 19h30. Dimanche de 07h30 à 13h00. Fermé le lundi.
- Téléphone : 04 73 00 12 34 | Email : contact@maison-auvergne-demo.fr

[DOC 2 - PRODUITS, ALLERGÈNES & CATALOGUE PDF]
- Spécialités : Pain au levain naturel (farines locales du Puy-de-Dôme), Brioche aux pralines, Pâtisseries fines, Tartes aux myrtilles d'Auvergne.
- Options sans gluten : Nous proposons une gamme de cakes et financiers à la farine de châtaigne sans gluten (préparés dans un atelier utilisant aussi du blé, traces possibles).
- Commandes gâteaux sur mesure (anniversaires, mariages) : À commander au minimum 48h à l'avance. Acompte de 30% demandé à la validation.

[DOC 3 - LIVRAISONS & CLIENTÈLE B2B / RESTAURANTS]
- Livraison locale (Clermont-Ferrand et agglomération) : Gratuite dès 35€ d'achat pour les particuliers, tous les matins entre 08h00 et 11h00.
- Comptes Professionnels (Hôtels, Restaurants, Entreprises) : Tarifs préférentiels B2B (-15% sur volume), livraison quotidienne dès 06h30, facturation mensuelle.

[DOC 4 - PROCÉDURE DE PRISE DE RENDEZ-VOUS / DEVIS]
- Si le client souhaite prendre rendez-vous en boutique (ex: dégustation mariage, devis traiteur ou ouverture compte B2B), demande-lui poliment : son nom, le motif du rendez-vous, la date/créneau souhaité et son email.
- Une fois ces informations fournies, confirme que le créneau est pré-réservé sur Google Calendar et qu'un email de confirmation vient d'être envoyé, et ajoute exactement à la fin de ta réponse le tag technique : [BOOKING_CONFIRMED]
`;

    const systemInstruction = `Tu es l'assistant virtuel officiel de "Maison Auvergne" à Clermont-Ferrand.
Règles strictes :
1. Réponds TOUJOURS en français naturel, chaleureux, professionnel et concis.
2. Base tes réponses UNIQUEMENT sur la Base de Connaissances fournie ci-dessous. Si une information n'y figure pas, propose de transmettre la demande par email à l'équipe (contact@maison-auvergne-demo.fr) sans inventer de faits.
3. Utilise des listes à puces courtes quand c'est utile pour la lisibilité.

${knowledgeBase}`;

    // Conversion de l'historique chat au format Gemini REST API
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Erreur API Gemini'
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Désolé, je n'ai pas pu traiter votre demande.";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur interne.' });
  }
}

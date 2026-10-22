import { resolveLanguage } from '../public/i18n.js';

const examples = {
  en: {
    vacancy: { title: 'Senior Frontend Developer', company: 'North Studio', location: 'Remote · Spain', description: 'We are looking for a Senior Frontend Developer to build B2B tools. Professional experience with React and TypeScript, accessible interfaces and automated testing is essential. Experience with design systems and collaboration with product teams is preferred. The team works remotely. We would like concrete project examples and an explanation of the person’s contribution.' },
    texts: [
      'FICTIONAL PROFILE FOR DEMONSTRATION\nAlex Rivera\nFrontend Developer\nExperience: 2021–2026 at Product One. Built B2B applications with React and TypeScript. Led the creation of a design system with 35 components. Added automated tests with Playwright and Vitest. Collaborated weekly with design and product teams. In 2025, improved accessibility with keyboard navigation and WCAG audits. A demonstration portfolio is available during the interview.',
      'FICTIONAL PROFILE FOR DEMONSTRATION\nSam Torres\nFull Stack Developer\nExperience: 2022–2026 at Services Two. Developed APIs with Python, FastAPI and PostgreSQL. Built internal dashboards with React and JavaScript. Backend testing with pytest. Collaborated with product teams on delivery planning. Automated deployments with Docker. Interested in learning TypeScript and developing web accessibility skills.',
      'FICTIONAL PROFILE FOR DEMONSTRATION\nDani Vega\nProduct Designer\nExperience: 2020–2026 at Studio Three. Designed B2B products in Figma and conducted user research. Created design systems and documented accessible components. Worked daily with frontend developers. Produced high-fidelity prototypes, usability tests and user flows. Knowledge of HTML and CSS. No professional programming experience declared.'
    ]
  },
  es: {
    vacancy: { title: 'Desarrollador frontend sénior', company: 'Estudio Norte', location: 'Remoto · España', description: 'Buscamos un perfil de desarrollo frontend sénior para construir herramientas B2B. Es imprescindible experiencia profesional con React y TypeScript, creación de interfaces accesibles y pruebas automatizadas. Valoramos experiencia con sistemas de diseño y colaboración con equipos de producto. El equipo trabaja de forma remota. Nos gustaría conocer ejemplos concretos de proyectos y la aportación de la persona en ellos.' },
    texts: [
      'PERFIL FICTICIO PARA DEMOSTRACIÓN\nAlex Rivera\nDesarrollo frontend\nExperiencia: 2021–2026 en Producto Uno. Desarrollo de aplicaciones B2B con React y TypeScript. Lideré la creación de un sistema de diseño con 35 componentes. Añadí pruebas automatizadas con Playwright y Vitest. Colaboración semanal con diseño y producto. En 2025 mejoré la accesibilidad con navegación por teclado y auditorías WCAG. Portafolio de demostración disponible durante la entrevista.',
      'PERFIL FICTICIO PARA DEMOSTRACIÓN\nSam Torres\nDesarrollo de aplicaciones completas\nExperiencia: 2022–2026 en Servicios Dos. Desarrollo de APIs con Python, FastAPI y PostgreSQL. Creación de paneles internos con React y JavaScript. Pruebas de backend con pytest. Colaboré con producto en la planificación de entregas. Automatización de despliegues con Docker. Interés en aprender TypeScript y profundizar en accesibilidad web.',
      'PERFIL FICTICIO PARA DEMOSTRACIÓN\nDani Vega\nDiseño de producto\nExperiencia: 2020–2026 en Estudio Tres. Diseño de productos B2B en Figma e investigación de usuarios. Creación de sistemas de diseño y documentación de componentes accesibles. Trabajo diario con desarrolladores frontend. Prototipos de alta fidelidad, pruebas de usabilidad y definición de flujos. Conocimientos de HTML y CSS. Sin experiencia profesional de programación declarada.'
    ]
  },
  fr: {
    vacancy: { title: 'Développeur frontend senior', company: 'Studio Nord', location: 'Télétravail · Espagne', description: 'Nous recherchons un profil de développement frontend senior pour créer des outils B2B. Une expérience professionnelle avec React et TypeScript, les interfaces accessibles et les tests automatisés est indispensable. Une expérience des systèmes de design et de la collaboration avec des équipes produit est souhaitée. L’équipe travaille à distance. Nous souhaitons découvrir des projets concrets et la contribution de la personne à chacun.' },
    texts: [
      'PROFIL FICTIF POUR LA DÉMONSTRATION\nAlex Rivera\nDéveloppement frontend\nExpérience : 2021–2026 chez Produit Un. Développement d’applications B2B avec React et TypeScript. Pilotage de la création d’un système de design de 35 composants. Ajout de tests automatisés avec Playwright et Vitest. Collaboration hebdomadaire avec les équipes design et produit. En 2025, amélioration de l’accessibilité avec la navigation au clavier et des audits WCAG. Portfolio de démonstration disponible pendant l’entretien.',
      'PROFIL FICTIF POUR LA DÉMONSTRATION\nSam Torres\nDéveloppement full stack\nExpérience : 2022–2026 chez Services Deux. Développement d’API avec Python, FastAPI et PostgreSQL. Création de tableaux de bord internes avec React et JavaScript. Tests du backend avec pytest. Collaboration avec l’équipe produit pour planifier les livraisons. Automatisation des déploiements avec Docker. Intérêt pour l’apprentissage de TypeScript et l’accessibilité web.',
      'PROFIL FICTIF POUR LA DÉMONSTRATION\nDani Vega\nDesign produit\nExpérience : 2020–2026 chez Studio Trois. Conception de produits B2B dans Figma et recherche utilisateur. Création de systèmes de design et documentation de composants accessibles. Collaboration quotidienne avec les développeurs frontend. Prototypes haute fidélité, tests d’utilisabilité et parcours utilisateur. Connaissances en HTML et CSS. Aucune expérience professionnelle en programmation déclarée.'
    ]
  },
  de: {
    vacancy: { title: 'Senior Frontend-Entwickler', company: 'Studio Nord', location: 'Remote · Spanien', description: 'Wir suchen ein erfahrenes Frontend-Profil für die Entwicklung von B2B-Werkzeugen. Berufserfahrung mit React und TypeScript, barrierefreien Oberflächen und automatisierten Tests ist erforderlich. Erfahrung mit Designsystemen und der Zusammenarbeit mit Produktteams ist wünschenswert. Das Team arbeitet remote. Wir möchten konkrete Projektbeispiele und den persönlichen Beitrag dazu kennenlernen.' },
    texts: [
      'FIKTIVES PROFIL ZUR DEMONSTRATION\nAlex Rivera\nFrontend-Entwicklung\nErfahrung: 2021–2026 bei Produkt Eins. Entwicklung von B2B-Anwendungen mit React und TypeScript. Leitung der Erstellung eines Designsystems mit 35 Komponenten. Ergänzung automatisierter Tests mit Playwright und Vitest. Wöchentliche Zusammenarbeit mit Design und Produktmanagement. 2025 Verbesserung der Barrierefreiheit durch Tastaturnavigation und WCAG-Prüfungen. Ein Demo-Portfolio steht im Gespräch zur Verfügung.',
      'FIKTIVES PROFIL ZUR DEMONSTRATION\nSam Torres\nFull-Stack-Entwicklung\nErfahrung: 2022–2026 bei Dienste Zwei. Entwicklung von APIs mit Python, FastAPI und PostgreSQL. Erstellung interner Dashboards mit React und JavaScript. Backend-Tests mit pytest. Zusammenarbeit mit dem Produktteam bei der Lieferplanung. Automatisierte Bereitstellung mit Docker. Interesse am Erlernen von TypeScript und an vertieften Kenntnissen zur Barrierefreiheit im Web.',
      'FIKTIVES PROFIL ZUR DEMONSTRATION\nDani Vega\nProduktdesign\nErfahrung: 2020–2026 bei Studio Drei. Gestaltung von B2B-Produkten in Figma und Nutzerforschung. Erstellung von Designsystemen und Dokumentation barrierefreier Komponenten. Tägliche Zusammenarbeit mit Frontend-Entwicklern. Hochauflösende Prototypen, Usability-Tests und Nutzerabläufe. Kenntnisse in HTML und CSS. Keine Berufserfahrung in der Programmierung angegeben.'
    ]
  }
};
const identities = [{ name: 'Alex Rivera', filename: 'alex_rivera.txt' }, { name: 'Sam Torres', filename: 'sam_torres.txt' }, { name: 'Dani Vega', filename: 'dani_vega.txt' }];
export const demoVacancy = examples.en.vacancy;
export const demoCandidates = identities.map((identity, i) => ({ ...identity, text: examples.en.texts[i] }));
export function localizeDemoVacancy(record, language) {
  return record.synthetic && record.id === 'demo-vacancy' ? { ...record, ...examples[resolveLanguage(language)].vacancy } : record;
}
export function localizeDemoCandidate(record, language) {
  const match = /^demo-candidate-([0-2])$/.exec(record.id);
  return record.synthetic && match ? { ...record, text: examples[resolveLanguage(language)].texts[Number(match[1])] } : record;
}

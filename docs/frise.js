/* Frise chronologique — PCF 79 et La Voix des Luttes.
   Lit window.FRISE_DONNEES (fabriqué par outils/frise_donnees.py), construit la frise
   en bas de l'écran, la une du mois choisi et le sommaire annuel du site fédéral.
   Aucune dépendance. */
'use strict';

(() => {
  const DONNEES = window.FRISE_DONNEES;
  if (!DONNEES || !DONNEES.publications.length) return;

  const dossier = new URL('.', document.currentScript.src);
  const dossierArchives = new URL(DONNEES.base, dossier);
  const lienArchive = (p) => new URL(encodeURIComponent(p.id) + '.html', dossierArchives).href;
  const lienImage = (p) => new URL(p.image, dossier).href;

  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
    'septembre', 'octobre', 'novembre', 'décembre'];
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const etroit = window.matchMedia('(max-width: 59.99em)');
  const racine = document.documentElement;
  const maison = document.querySelector('#home');

  /* ---------------------------------------------------------- Les mois */

  const premier = DONNEES.publications[0].date.slice(0, 7);
  const aujourdhui = new Date();
  const dernierDonnees = DONNEES.publications[DONNEES.publications.length - 1].date.slice(0, 7);
  const present = [`${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}`, dernierDonnees].sort()[1];

  const mois = []; // { cle: '2023-03', an, m (0-11), pubs: [] }
  for (let [a, m] = premier.split('-').map(Number); ; m++) {
    if (m > 12) { m = 1; a++; }
    const cle = `${a}-${String(m).padStart(2, '0')}`;
    mois.push({ cle, an: a, m: m - 1, pubs: [] });
    if (cle === present) break;
  }
  const indexDe = new Map(mois.map((x, i) => [x.cle, i]));
  for (const p of DONNEES.publications) {
    const i = indexDe.get(p.date.slice(0, 7));
    if (i !== undefined) mois[i].pubs.push(p);
  }
  for (const x of mois) x.pubs.reverse(); // le plus récent d'abord
  const DERNIER = mois.length - 1;
  const maxi = Math.max(...mois.map((x) => x.pubs.length));

  const nomMois = (i) => `${MOIS[mois[i].m]} ${mois[i].an}`;
  const compte = (n) => (n === 0 ? 'aucune publication' : `${n} publication${n > 1 ? 's' : ''}`);
  const jour = (date) => {
    const [a, m, j] = date.split('-').map(Number);
    return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
  };
  const ilYa = (i) => {
    const n = DERNIER - i;
    const ans = Math.floor(n / 12);
    const reste = n % 12;
    const morceaux = [];
    if (ans) morceaux.push(`${ans} an${ans > 1 ? 's' : ''}`);
    if (reste) morceaux.push(`${reste} mois`);
    return `il y a ${morceaux.join(' et ')}`;
  };
  const echapper = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ---------------------------------------------------------- L'actualité fédérale de l'année */

  const labelActualites = document.querySelector('[data-actualites-mois]');
  const rubriqueActualites = labelActualites?.closest('#actualites');
  const articlesDuMois = rubriqueActualites?.querySelector('#stories');
  const labelDuMois = labelActualites?.textContent;
  let anneeAffichee = null;
  let actualitesAnnuelles;

  function afficherActualitesAnnuelles(annee) {
    if (!articlesDuMois || !DONNEES.archivesEnLigne || annee === anneeAffichee) return;
    anneeAffichee = annee;
    labelActualites.textContent = annee === null ? labelDuMois : `Archives de ${annee}`;
    articlesDuMois.hidden = annee !== null;
    if (annee === null) {
      actualitesAnnuelles.hidden = true;
      return;
    }
    if (!actualitesAnnuelles) {
      actualitesAnnuelles = document.createElement('div');
      actualitesAnnuelles.className = 'frise-actualites';
      articlesDuMois.after(actualitesAnnuelles);
    }

    const edition = new Map();
    for (const article of window.ARTICLES || []) {
      const [date, nom, an] = article.date.split(' ');
      const m = MOIS.indexOf(nom);
      if (Number(an) !== annee || m < 0) continue;
      const iso = `${an}-${String(m + 1).padStart(2, '0')}-${date.replace('er', '').padStart(2, '0')}`;
      if (!edition.has(m)) edition.set(m, []);
      edition.get(m).push({
        date: iso, titre: article.title, extrait: article.deck, type: article.type,
        ancre: `#article/${encodeURIComponent(article.id)}`,
      });
    }

    const moisDeLAnnee = mois.filter((x) => x.an === annee).reverse();
    const contenu = moisDeLAnnee.map(({ m, pubs }) => {
      const articles = [...pubs, ...(edition.get(m) || [])].sort((a, b) => b.date.localeCompare(a.date));
      if (!articles.length) return '';
      const cartes = articles.map((p) => `
        <article>
          <p class="kicker">${p.type ? echapper(p.type) + ' · ' : ''}<time datetime="${echapper(p.date)}">${jour(p.date)}</time></p>
          <h4><a href="${echapper(p.ancre || lienArchive(p))}">${echapper(p.titre)}</a></h4>
          ${p.extrait ? `<p>${echapper(p.extrait)}</p>` : ''}
        </article>`).join('');
      return `<section><h3>${MOIS[m]} ${annee}</h3><div class="frise-actualites-liste">${cartes}</div></section>`;
    }).join('');
    actualitesAnnuelles.innerHTML = contenu || '<p>Aucune publication pour cette année.</p>';
    actualitesAnnuelles.hidden = false;
  }

  if (articlesDuMois) {
    document.addEventListener('click', (event) => {
      if (anneeAffichee === null || event.defaultPrevented || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || !event.target.closest('a[href="#actualites"]')) return;
      event.preventDefault();
      rubriqueActualites.scrollIntoView();
    });
  }

  /* ---------------------------------------------------------- Le choix de l'article principal

     La seule règle à changer pour choisir autrement : d'abord une publication propre
     à la fédération, avec une image si possible ; sinon une publication avec image ;
     sinon la première du mois. */
  const PROPRE = /(du PCF 79|de la fédération|fédéral|fédérale)$|^(Prise de position|Appels? archivés?|Appel à la mobilisation|Annonce archivée|Compte rendu( local)?|Vie fédérale|Tract)$/i;
  const RELAYE = /relay|partag|national|renvoi/i;
  function choisirPrincipal(pubs) {
    const propres = pubs.filter((p) => PROPRE.test(p.type) && !RELAYE.test(p.type));
    return propres.find((p) => p.image) || pubs.find((p) => p.image) || propres[0] || pubs[0] || null;
  }

  /* ---------------------------------------------------------- La frise (DOM) */

  const frise = document.createElement('section');
  frise.className = 'frise';
  frise.setAttribute('aria-label', 'Remonter le temps');
  frise.innerHTML = `
    <div class="frise-int">
      <div class="frise-piste" role="slider" tabindex="0" aria-label="Mois affiché"
           aria-valuemin="0" aria-valuemax="${DERNIER}" aria-orientation="horizontal">
        <div class="frise-ruban">
          <div class="frise-ligne"><\/div><div class="frise-parcouru"><\/div>
        <\/div>
        <span class="frise-survol" aria-hidden="true"><\/span>
        <div class="frise-tete" aria-hidden="true"><span class="frise-trait"><\/span><span class="frise-etiquette"><\/span><\/div>
      <\/div>
      <button type="button" class="frise-bouton frise-aujourdhui">Aujourd’hui<\/button>
    <\/div>
    <p class="frise-annonce" aria-live="polite"><\/p>`;
  document.body.append(frise);
  document.body.classList.add('frise-presente');

  const message = document.createElement('p');
  message.className = 'frise-message';
  message.setAttribute('role', 'status');
  document.body.append(message);

  const piste = frise.querySelector('.frise-piste');
  const ruban = frise.querySelector('.frise-ruban');
  const parcouru = frise.querySelector('.frise-parcouru');
  const tete = frise.querySelector('.frise-tete');
  const etiquette = frise.querySelector('.frise-etiquette');
  const annonce = frise.querySelector('.frise-annonce');
  const survol = frise.querySelector('.frise-survol');
  const ABREGES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const lettres = [];
  const finSurvol = window.matchMedia('(hover: hover) and (pointer: fine)');
  const boutonPresent = frise.querySelector('.frise-aujourdhui');

  const barres = mois.map((x, i) => {
    const barre = document.createElement('span');
    barre.className = 'frise-mois' + (x.m === 0 ? ' est-janvier' : '');
    barre.style.setProperty('--i', i);
    barre.style.setProperty('--h', x.pubs.length ? Math.max(0.08, Math.sqrt(x.pubs.length / maxi)) : 0);
    ruban.append(barre);
    // Le nom abrégé du mois (l'année pour janvier), visible quand la frise est saisie.
    const lettre = document.createElement('span');
    lettre.className = 'frise-lettre';
    lettre.style.setProperty('--i', i);
    lettre.textContent = x.m === 0 ? String(x.an) : ABREGES[x.m];
    if (x.m === 0) lettre.classList.add('est-annee');
    lettres.push(lettre);
    ruban.append(lettre);
    if (x.m === 0 || i === 0) {
      const an = document.createElement('span');
      an.className = 'frise-an';
      an.style.setProperty('--i', i);
      an.textContent = x.an;
      ruban.append(an);
    }
    return barre;
  });

  /* ---------------------------------------------------------- La une (DOM) */

  const une = document.createElement('section');
  une.className = 'frise-une';
  une.hidden = true;
  une.setAttribute('aria-label', 'Archives du mois choisi');
  une.innerHTML = `
    <p class="fu-bandeau"><span class="fu-ou"><\/span><button type="button" class="fu-retour">Revenir à aujourd’hui<\/button><\/p>
    <div class="fu-bloc">
      <div class="fu-fond" aria-hidden="true"><span class="fu-astre"><i><\/i><\/span><\/div>
      <div class="fu-quand"><h2 class="fu-date"><span class="fu-lu"><\/span><span class="fu-ligne fu-nom" aria-hidden="true"><\/span><span class="fu-ligne fu-annee" aria-hidden="true"><\/span><\/h2><\/div>
      <div class="fu-principal"><\/div>
      <figure class="fu-image"><\/figure>
      <aside class="fu-cote"><\/aside>
    <\/div>`;
  maison.prepend(une);
  const bloc = une.querySelector('.fu-bloc');
  const ou = une.querySelector('.fu-ou');
  const dateEl = une.querySelector('.fu-date');
  const dateLue = une.querySelector('.fu-lu');
  const ligneNom = une.querySelector('.fu-nom');
  const ligneAn = une.querySelector('.fu-annee');
  const astre = une.querySelector('.fu-astre i');
  const principal = une.querySelector('.fu-principal');
  const image = une.querySelector('.fu-image');
  const cote = une.querySelector('.fu-cote');

  /* ---------------------------------------------------------- La date en volets */

  function ecrireLigne(ligne, texte, anime, sens) {
    const ancien = ligne.textContent;
    if (ancien === texte) return;
    const cases = Array.from(ligne.children);
    const meme = cases.length === texte.length;
    if (!meme) {
      ligne.replaceChildren(...Array.from(texte, (c) => {
        const s = document.createElement('span');
        s.className = 'fu-case';
        s.textContent = c;
        return s;
      }));
    }
    Array.from(texte).forEach((c, k) => {
      const s = ligne.children[k];
      if (meme && s.textContent === c) return;
      s.textContent = c;
      s.getAnimations().forEach((animation) => animation.cancel());
      if (anime) {
        // Chaque lettre bascule comme le volet d'un tableau d'affichage.
        s.animate([
          { transform: `perspective(400px) rotateX(${sens * 88}deg)`, opacity: 0.2 },
          { transform: 'perspective(400px) rotateX(0deg)', opacity: 1 },
        ], { duration: 340, delay: k * 22, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'backwards' });
      }
    });
  }

  function ecrireDate(i, anime, sens) {
    dateLue.textContent = nomMois(i);
    ecrireLigne(ligneNom, MOIS[mois[i].m], anime, sens);
    ecrireLigne(ligneAn, String(mois[i].an), anime, sens);
    // Le quart de cercle se remplit au fil de l'année.
    astre.style.transform = `scale(${((mois[i].m + 1) / 12).toFixed(3)})`;
  }

  /* ---------------------------------------------------------- Remplir la une */

  const VISIBLES = 4;
  let ouverte = false;
  let contenuDe = -1;

  function carte(p, rang) {
    const img = ouverte && p.image ? `<img src="${lienImage(p)}" alt="" loading="lazy">` : '';
    return `<li class="fu-carte" data-id="${echapper(p.id)}" style="--rang:${rang}">
      <p class="kicker">${echapper(p.type || 'Publication')} · ${jour(p.date).replace(/ \d{4}$/, '')}<\/p>
      <h3><a href="${lienArchive(p)}" data-archive>${echapper(p.titre)}<\/a><\/h3>${img}<\/li>`;
  }

  function remplirCote(i, cascade) {
    const x = mois[i];
    const tete = choisirPrincipal(x.pubs);
    const autres = x.pubs.filter((p) => p !== tete);
    cote.classList.toggle('est-ouverte', ouverte);
    bloc.classList.toggle('est-large', ouverte);
    if (!x.pubs.length) {
      cote.innerHTML = '';
      cote.hidden = true;
      return;
    }
    cote.hidden = false;
    const montrees = ouverte ? autres : autres.slice(0, VISIBLES);
    const reste = autres.length - montrees.length;
    let suite = '';
    if (reste > 0) suite = `<button type="button" class="fu-suite" aria-expanded="false">Voir les ${reste} autre${reste > 1 ? 's' : ''} <span aria-hidden="true">↓<\/span><\/button>`;
    else if (ouverte && autres.length > VISIBLES) suite = '<button type="button" class="fu-suite" aria-expanded="true">Replier la liste <span aria-hidden="true">↑<\/span><\/button>';
    cote.innerHTML = `<p class="kicker">Ce mois-là · ${compte(x.pubs.length)}<\/p>`
      + (autres.length ? `<ul class="fu-liste">${montrees.map(carte).join('')}<\/ul>` : '<p>Une seule publication ce mois-là.<\/p>')
      + suite;
    cote.querySelectorAll('.fu-carte').forEach((c, k) => {
      if (k < VISIBLES) { if (cascade && !reduit.matches) c.classList.add('en-cascade'); }
      else c.classList.add('au-defilement');
    });
  }

  function remplir(i, cascade = true) {
    contenuDe = i;
    ouverte = false;
    const x = mois[i];
    ou.textContent = `Archives · ${ilYa(i)}`;
    const p = choisirPrincipal(x.pubs);
    if (!p) {
      // Un mois vide propose le mois le plus proche qui a des publications.
      let proche = -1;
      for (let d = 1; d <= mois.length && proche < 0; d++) {
        if (i - d >= 0 && mois[i - d].pubs.length) proche = i - d;
        else if (i + d < DERNIER && mois[i + d].pubs.length) proche = i + d;
      }
      principal.innerHTML = `<p class="kicker">${nomMois(i)}<\/p><p class="fu-vide">Aucune publication ce mois-là.<\/p>`
        + (proche >= 0 ? `<button type="button" class="cta" data-aller="${proche}">Aller en ${nomMois(proche)} <span aria-hidden="true">→<\/span><\/button>` : '');
      image.innerHTML = '';
      bloc.classList.add('sans-image');
    } else {
      principal.innerHTML = `<p class="kicker">${echapper(p.type || 'Publication')} · ${jour(p.date)}<\/p>
        <h3 class="fu-titre"><a href="${lienArchive(p)}" data-archive>${echapper(p.titre)}<\/a><\/h3>
        ${p.extrait ? `<p class="fu-extrait">${echapper(p.extrait)}<\/p>` : ''}
        <a class="cta" href="${lienArchive(p)}" data-archive>Lire l’archive <span aria-hidden="true">↗<\/span><\/a>`;
      image.innerHTML = p.image ? `<img src="${lienImage(p)}" alt="${echapper(p.alt || '')}">` : '';
      bloc.classList.toggle('sans-image', !p.image);
    }
    remplirCote(i, cascade);
    une.classList.remove('en-transit');
  }

  /* ---------------------------------------------------------- Passages (View Transitions) */

  let passage = null;
  function avecPassage(changer, sens, bascule) {
    if (passage) passage.skipTransition();
    if (!document.startViewTransition || reduit.matches || document.hidden) {
      passage = null;
      racine.classList.remove('frise-bascule');
      changer();
      return;
    }
    racine.dataset.friseSens = sens < 0 ? 'passe' : 'futur';
    racine.classList.toggle('frise-bascule', bascule);
    const transition = document.startViewTransition(() => {
      if (passage === transition) changer();
    });
    passage = transition;
    const terminer = () => {
      if (passage !== transition) return;
      racine.classList.remove('frise-bascule');
      passage = null;
    };
    transition.ready.catch(() => {}); // Une sélection suivante peut interrompre le passage.
    transition.finished.then(terminer, terminer);
  }

  let archives = false;
  function montrerArchives(oui) {
    archives = oui;
    une.hidden = !oui;
    document.body.classList.toggle('frise-archives', oui);
  }

  /* ---------------------------------------------------------- Position et rendu */

  let pos = DERNIER;      // position continue, en mois
  let courant = -1;       // mois affiché (entier)
  let cible = null;       // mois visé par le ressort
  let doitPoser = false;
  let vitesse = 0;        // mois par seconde
  let inertie = false;
  let geste = null;
  let pas = 8;
  let marge = 66;
  let largeur = 0;
  let graisse = 700;
  let zoom = 1;           // écart des mois, sur téléphone, quand la frise est saisie
  let zoomVitesse = 0;
  const demoSaisie = new URLSearchParams(location.search).has('saisie');
  // Zoom horizontal de la frise saisie : assez pour que les noms des mois ne se chevauchent pas.
  const zoomMax = () => (etroit.matches ? 4.2 : Math.max(1, 54 / pas));
  const zoomVise = () => ((geste || frise.classList.contains('est-saisie')) && !reduit.matches ? zoomMax() : 1);
  let ancre = 0;          // sur ordinateur, abscisse fixe de la tête pendant la saisie

  function mesurer() {
    largeur = piste.clientWidth;
    if (etroit.matches) {
      pas = 16;
      marge = 0;
    } else {
      marge = Math.min(70, largeur * 0.08);
      pas = (largeur - 2 * marge) / DERNIER;
    }
    ruban.style.setProperty('--frise-pas', `${pas}px`);
    ruban.style.width = `${DERNIER * pas}px`;
    racine.style.setProperty('--frise-hauteur', `${frise.offsetHeight}px`);
    dessiner();
  }

  function abscisseTete() {
    // Repos : sur téléphone la tête est au centre ; sur ordinateur elle parcourt la piste.
    // Saisie : la tête reste fixe (centre ou point saisi) et la règle élargie glisse dessous.
    const z = zoomMax();
    const t = z > 1 ? Math.max(0, Math.min(1, (zoom - 1) / (z - 1))) : 0;
    return etroit.matches ? largeur / 2 : (marge + pos * pas) * (1 - t) + ancre * t;
  }

  function dessiner() {
    const x = abscisseTete();
    const decalage = x - pos * pas * zoom;
    ruban.style.transform = `translate3d(${decalage}px,0,0) scaleX(${zoom})`;
    ruban.style.setProperty('--z', zoom.toFixed(4));
    tete.style.transform = `translate3d(${x}px,0,0)`;
    parcouru.style.transform = `scaleX(${((DERNIER - pos) / DERNIER).toFixed(4)})`;
    const i = Math.max(0, Math.min(DERNIER, Math.round(pos)));
    if (i !== courant) changerMois(i);
  }

  function changerMois(i) {
    const avant = courant;
    courant = i;
    if (avant >= 0) { barres[avant].classList.remove('est-choisi'); lettres[avant].classList.remove('est-choisi'); }
    barres[i].classList.add('est-choisi');
    lettres[i].classList.add('est-choisi');
    etiquette.textContent = i === DERNIER ? 'Aujourd’hui' : nomMois(i);
    piste.setAttribute('aria-valuenow', i);
    piste.setAttribute('aria-valuetext', `${nomMois(i)}, ${compte(mois[i].pubs.length)}`);
    boutonPresent.disabled = i === DERNIER;
    // Le papier vieillit avec la distance (racine carrée : le jaunissement vient vite, puis se pose).
    racine.style.setProperty('--frise-age', Math.sqrt((DERNIER - i) / DERNIER).toFixed(3));
    const enMouvement = geste || inertie || cible !== null;
    ecrireDate(i, avant >= 0 && archives && !reduit.matches, i < avant ? -1 : 1);
    if (archives) {
      ou.textContent = `Archives · ${i === DERNIER ? 'ce mois-ci' : ilYa(i)}`;
      une.classList.toggle('en-transit', i !== contenuDe);
    } else if (enMouvement && (geste || inertie) && i < DERNIER) {
      // Le doigt quitte le présent : la une apparaît tout de suite.
      montrerArchives(true);
      remplir(i, false);
    }
  }

  function poser() {
    // Fin du geste : la une se met à jour, l'adresse et l'annonce aussi.
    const i = courant;
    annonce.textContent = `${nomMois(i)}, ${compte(mois[i].pubs.length)}`;
    ecrireAdresse(i);
    const veut = i < DERNIER;
    afficherActualitesAnnuelles(veut ? mois[i].an : null);
    const sens = i < contenuDe || (!archives && veut) ? -1 : 1;
    if (veut !== archives) {
      avecPassage(() => {
        montrerArchives(veut);
        if (veut) { ecrireDate(i, false, 1); remplir(i); }
      }, veut ? -1 : 1, true);
    } else if (veut && i !== contenuDe) {
      avecPassage(() => remplir(i), sens, false);
    }
  }

  /* ---------------------------------------------------------- Boucle d'animation */

  let dernierTemps = 0;
  let boucle = 0;

  // Solution du ressort amorti sur l'intervalle écoulé, même si une image a sauté.
  function ressort(position, vitesse, cible, pulsation, dt) {
    const distance = position - cible;
    const elan = (vitesse + pulsation * distance) * dt;
    const amortissement = Math.exp(-pulsation * dt);
    return [cible + (distance + elan) * amortissement, (vitesse - pulsation * elan) * amortissement];
  }

  function animer(t) {
    const dt = dernierTemps ? Math.min(0.05, (t - dernierTemps) / 1000) : 1 / 60;
    dernierTemps = t;
    const avant = pos;
    if (reduit.matches) {
      if (cible !== null) pos = cible;
      inertie = false;
      cible = null;
      vitesse = 0;
      zoom = 1;
      zoomVitesse = 0;
      graisse = 700;
    } else if (inertie) {
      const amortissement = Math.exp(-dt * 4.2);
      pos += vitesse * (1 - amortissement) / 4.2;
      vitesse *= amortissement;
      if (pos < 0 || pos > DERNIER || Math.abs(vitesse) < 2.2) {
        inertie = false;
        cible = Math.max(0, Math.min(DERNIER, Math.round(pos + vitesse * 0.12)));
        if (pos < 0 || pos > DERNIER) vitesse = 0;
      }
    } else if (cible !== null) {
      [pos, vitesse] = ressort(pos, vitesse, cible, 17, dt);
      if (Math.abs(cible - pos) < 0.006 && Math.abs(vitesse) < 0.09) {
        pos = cible;
        vitesse = 0;
        cible = null;
      }
    }
    pos = Math.max(-0.4, Math.min(DERNIER + 0.4, pos));
    const echelle = zoomVise();
    if (zoom !== echelle || zoomVitesse) {
      [zoom, zoomVitesse] = ressort(zoom, zoomVitesse, echelle, 17, dt);
      if (Math.abs(echelle - zoom) < 0.002 && Math.abs(zoomVitesse) < 0.02) {
        zoom = echelle;
        zoomVitesse = 0;
      }
    }
    // La graisse de la date suit la vitesse : légère quand on file, pleine à l'arrêt.
    if (!reduit.matches) {
      const vue = geste
        ? geste.vitesse * Math.exp(-Math.max(0, t - geste.temps) / 90)
        : (pos - avant) / Math.max(dt, 0.001);
      graisse += ((700 - Math.min(380, Math.abs(vue) * 16)) - graisse) * (1 - Math.exp(-dt * 10));
    }
    dateEl.style.setProperty('--fu-graisse', Math.round(graisse));
    dessiner();
    const doitGlisser = geste || inertie || cible !== null;
    if (!doitGlisser && doitPoser) {
      doitPoser = false;
      poser();
    }
    if (inertie || cible !== null || Math.abs(graisse - 700) > 2 || zoom !== echelle) {
      boucle = requestAnimationFrame(animer);
    } else {
      boucle = 0;
      dernierTemps = 0;
      graisse = 700;
      dateEl.style.setProperty('--fu-graisse', graisse);
    }
  }
  function lancer() {
    if (!boucle) boucle = requestAnimationFrame(animer);
  }

  function allerA(i, immediat = false) {
    i = Math.max(0, Math.min(DERNIER, i));
    inertie = false;
    if (immediat || reduit.matches) {
      pos = i;
      vitesse = 0;
      cible = null;
      doitPoser = false;
      dessiner();
      poser();
      return;
    }
    cible = i;
    doitPoser = true;
    lancer();
  }
  const visee = () => (cible !== null ? cible : courant);

  /* ---------------------------------------------------------- Gestes */

  piste.addEventListener('pointerdown', (e) => {
    if (geste || e.button !== 0) return;
    piste.setPointerCapture(e.pointerId);
    inertie = false;
    cible = null;
    vitesse = 0;
    geste = { id: e.pointerId, departX: e.clientX, temps: e.timeStamp, dernierX: e.clientX, vitesse: 0, bouge: false };
    frise.dataset.geste = '';
    frise.classList.add('est-saisie');
    cacherSurvol();
    if (!etroit.matches) {
      // Sur grand écran, la tête vient sous la souris, puis la règle s'élargit autour d'elle.
      const x = e.clientX - piste.getBoundingClientRect().left;
      const vise = pos + (x - abscisseTete()) / (pas * zoom);
      pos = Math.max(0, Math.min(DERNIER, vise));
      ancre = x + (pos - vise) * pas * zoom;
      dessiner();
    }
    lancer();
  });

  piste.addEventListener('pointermove', (e) => {
    if (!geste) { montrerSurvol(e); return; }
    if (e.pointerId !== geste.id) return;
    if (Math.abs(e.clientX - geste.departX) > 3) geste.bouge = true;
    // Le zoom ne déplace pas le mois sous la tête tant que le pointeur ne bouge pas.
    const deplacement = (geste.dernierX - e.clientX) / (pas * zoom);
    pos += deplacement;
    pos = Math.max(-0.4, Math.min(DERNIER + 0.4, pos));
    const dt = Math.max(1, e.timeStamp - geste.temps) / 1000;
    geste.vitesse += (deplacement / dt - geste.vitesse) * (1 - Math.exp(-dt / 0.035));
    geste.temps = e.timeStamp;
    geste.dernierX = e.clientX;
    lancer();
  });

  // Survol à la souris : le mois sous le pointeur se lève, une étiquette le nomme ;
  // un simple clic y va (la tête vient sous la souris au pointerdown).
  let survole = -1;
  function montrerSurvol(e) {
    if (!finSurvol.matches || etroit.matches || zoom !== 1) { cacherSurvol(); return; }
    const r = piste.getBoundingClientRect();
    const i = Math.round((e.clientX - r.left - marge) / pas);
    if (i < 0 || i > DERNIER) { cacherSurvol(); return; }
    if (i !== survole) {
      if (survole >= 0) barres[survole].classList.remove('est-survole');
      survole = i;
      barres[i].classList.add('est-survole');
      survol.textContent = `${nomMois(i)} · ${mois[i].pubs.length}`;
    }
    survol.style.transform = `translate3d(${marge + i * pas}px,0,0) translateX(-50%)`;
    survol.classList.add('est-visible');
  }
  function cacherSurvol() {
    if (survole >= 0) barres[survole].classList.remove('est-survole');
    survole = -1;
    survol.classList.remove('est-visible');
  }
  piste.addEventListener('pointerleave', cacherSurvol);

  function finGeste(e) {
    if (geste?.id !== e.pointerId) return;
    const g = geste;
    geste = null;
    delete frise.dataset.geste;
    if (!demoSaisie) frise.classList.remove('est-saisie');
    if (piste.hasPointerCapture(e.pointerId)) piste.releasePointerCapture(e.pointerId);
    const lance = e.type === 'pointerup' && e.timeStamp - g.temps < 90 && g.bouge;
    if (lance && Math.abs(g.vitesse) > 3 && !reduit.matches) {
      vitesse = Math.max(-54, Math.min(54, g.vitesse));
      inertie = true;
    } else {
      vitesse = 0;
      cible = Math.max(0, Math.min(DERNIER, Math.round(pos)));
    }
    doitPoser = true;
    lancer();
  }
  piste.addEventListener('pointerup', finGeste);
  piste.addEventListener('pointercancel', finGeste);
  piste.addEventListener('lostpointercapture', finGeste);

  // Molette : horizontale de préférence ; la verticale sert aussi, la frise ne défile pas.
  let cumul = 0;
  piste.addEventListener('wheel', (e) => {
    e.preventDefault();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    cumul += d * (e.deltaMode === 1 ? 16 : 1);
    const n = Math.trunc(cumul / 40);
    if (n) {
      cumul -= n * 40;
      allerA(visee() + n);
    }
  }, { passive: false });

  piste.addEventListener('keydown', (e) => {
    const sauts = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageUp: -12, PageDown: 12 };
    let i = null;
    if (e.key in sauts) i = visee() + sauts[e.key];
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = DERNIER;
    if (i === null) return;
    e.preventDefault();
    allerA(i);
  });

  boutonPresent.addEventListener('click', () => allerA(DERNIER));

  /* ---------------------------------------------------------- Clics dans la une */

  let minuterie = 0;
  function dire(texte) {
    message.textContent = texte;
    message.classList.add('est-visible');
    clearTimeout(minuterie);
    minuterie = setTimeout(() => message.classList.remove('est-visible'), 2600);
  }

  une.addEventListener('click', (e) => {
    if (e.target.closest('[data-archive]') && !DONNEES.archivesEnLigne) {
      e.preventDefault();
      dire('Cette archive sera bientôt consultable sur le site.');
      return;
    }
    const aller = e.target.closest('[data-aller]');
    if (aller) { allerA(Number(aller.dataset.aller)); return; }
    if (e.target.closest('.fu-retour')) { allerA(DERNIER); return; }
    const suite = e.target.closest('.fu-suite');
    if (suite) {
      // FLIP : les cartes déjà là glissent vers leur nouvelle place.
      const avant = new Map(Array.from(cote.querySelectorAll('.fu-carte'), (c) => [c.dataset.id, c.getBoundingClientRect()]));
      ouverte = !ouverte;
      remplirCote(contenuDe, false);
      if (!reduit.matches) {
        cote.querySelectorAll('.fu-carte').forEach((c, k) => {
          const r0 = avant.get(c.dataset.id);
          if (r0) {
            const r1 = c.getBoundingClientRect();
            c.animate([{ transform: `translate(${r0.left - r1.left}px,${r0.top - r1.top}px)` }, { transform: 'none' }],
              { duration: 480, easing: 'cubic-bezier(.2,1.2,.35,1)' });
          } else if (k < 16) {
            c.classList.remove('au-defilement');
            c.style.setProperty('--rang', k - avant.size);
            c.classList.add('en-cascade');
          }
        });
      }
      const nouveau = cote.querySelector('.fu-suite');
      if (nouveau) nouveau.focus({ preventScroll: true });
      if (!ouverte) une.scrollIntoView({ block: 'start', behavior: reduit.matches ? 'auto' : 'smooth' });
    }
  });

  /* ---------------------------------------------------------- L'adresse : #temps/2023-03 */

  function lireAdresse() {
    const m = /^#temps\/(\d{4}-\d{2})$/.exec(location.hash);
    if (!m) return null;
    const i = indexDe.get(m[1]);
    return i === undefined ? (m[1] < premier ? 0 : DERNIER) : i;
  }

  function ecrireAdresse(i) {
    const voulu = i === DERNIER ? '' : `#temps/${mois[i].cle}`;
    const actuel = /^#temps\//.test(location.hash) ? location.hash : '';
    if (voulu === actuel) return;
    if (!voulu && location.hash && !actuel) return; // un autre ancrage est ouvert : on le laisse
    const ancienneAdresse = location.href;
    history.pushState(null, '', voulu || location.pathname + location.search);
    // Le lecteur des deux sites réagit aux changements d’ancre.
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: ancienneAdresse, newURL: location.href }));
  }

  window.addEventListener('popstate', () => {
    const i = lireAdresse();
    allerA(i === null ? DERNIER : i);
  });

  /* ---------------------------------------------------------- Départ */

  // Seule la largeur compte : la hauteur change quand la frise est saisie.
  let largeurVue = 0;
  new ResizeObserver(() => {
    if (piste.clientWidth !== largeurVue) { largeurVue = piste.clientWidth; mesurer(); }
  }).observe(piste);
  etroit.addEventListener('change', mesurer);
  window.addEventListener('frise:habillage', mesurer);

  const depart = lireAdresse();
  mesurer();
  if (depart !== null && depart < DERNIER) {
    pos = depart;
    dessiner();
    montrerArchives(true);
    ecrireDate(depart, false, 1);
    remplir(depart);
    afficherActualitesAnnuelles(mois[depart].an);
    une.classList.add('est-arrivee');
  }
  // Démonstration : ?saisie montre la frise saisie (zoom), une fois la page posée.
  if (demoSaisie) setTimeout(() => { frise.classList.add('est-saisie'); ancre = marge + pos * pas; zoom = zoomVise(); dessiner(); lancer(); }, 2500);
  requestAnimationFrame(() => frise.classList.add('est-prete'));
})();

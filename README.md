# PCF 79 et La Voix des Luttes

Ce dépôt réunit le site de la fédération du PCF des Deux-Sèvres et celui du journal La Voix des Luttes. Les deux pages d’entrée se trouvent dans [docs/index.html](docs/index.html) et [docs/voixdesluttes/index.html](docs/voixdesluttes/index.html).

Pour essayer les deux sites en local, ouvrir les fichiers HTML ou lancer la commande suivante depuis le dépôt.

```sh
python3 -m http.server 8080 --bind 127.0.0.1 --directory docs
```

Le site fédéral s’ouvre à la racine du serveur et le journal à l’adresse relative `voixdesluttes/`. Pour une publication depuis une branche, sélectionner la branche `main` et le dossier `/docs` dans les réglages GitHub Pages.

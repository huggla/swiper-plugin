# Pull Request: feat: ManipulateLayers accepterar inline-konfig

ManipulateLayers-funktionen stöder nu både att ta emot origo-konfigurationen antingen som en filväg (string) eller som ett JSON-objekt (inline). Detta möjliggör enklare integration för den som vill leverera konfiguration dynamiskt från JavaScript.

- Bakåtkompatibilitet bibehålls
- Om parameter är en string laddas filen, om parameter är ett objekt används det direkt

Fixes #41
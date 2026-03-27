# 🎮 ViralTops — YouTube Top Videos

App web para ver el Top 15 de videos más virales de YouTube por categoría.

## 🚀 Cómo ejecutar

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor
npm start
# o para desarrollo con recarga automática:
npm run dev

# 3. Abrir en el navegador
http://localhost:3000
```

## 📦 Arquitectura de Agentes

El sistema usa un pipeline de 3 agentes coordinados por el Orquestador:

1. **VideoCollector** — Recolecta videos de YouTube API por categoría
2. **ViralAnalyzer** — Calcula score de viralidad + análisis con OpenAI GPT-4o-mini
3. **DataStructurer** — Organiza y guarda los datos en caché JSON

## 📅 Actualización semanal

Los tops se actualizan automáticamente cada **lunes a las 00:00 UTC**.
También puedes forzar una actualización desde la interfaz o con:

```
POST /api/refresh
```

## 🏆 Categorías

| Categoría | Descripción |
|-----------|-------------|
| 🌍 Mundial | Top global sin restricciones |
| 🇪🇸 Español | Videos en español |
| 🇺🇸 Inglés | Videos en inglés |
| 🧸 Niños | Contenido infantil (safe search) |
| 🎮 Videojuegos | Gaming |
| 🎬 Documentales | Documentales |
| 🎭 Entretenimiento | Entertainment |
| 🎵 Música | Music videos |
| 🤖 IA/AI | Videos con IA |
| ⚽ Deportes | Sports |
| 💻 Tecnología | Tech |
| 😂 Comedia | Comedy |

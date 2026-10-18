// Stand-in for autolinker (vite.config.ts aliases it here): only the kit's calendar card links text with it, and the
// wall shows no calendar card. Text is left as it is.
const Autolinker = { link: (text: string) => text };
export default Autolinker;

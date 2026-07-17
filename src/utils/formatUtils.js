export const formatRichText = (txt, themeConfig) => {
  if (!txt) return '';
  let html = txt
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/==(.*?)==/g, `<mark class="${themeConfig.highlight} px-1 mx-0.5 rounded">$1</mark>`)
    .replace(/\*\*(.*?)\*\*/g, `<strong class="font-bold ${themeConfig.bold}" style="font-weight: bold;">$1</strong>`);
  return html.replace(/\n/g, '<br/>');
};

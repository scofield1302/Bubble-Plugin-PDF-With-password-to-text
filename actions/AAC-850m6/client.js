function(properties, context) {
  const fetch = require('node-fetch');
  const { getDocument } = require('pdfjs-dist');

  // Ensures that the URL starts with 'http://' or 'https://'
  // If not, it prepends 'https://'
  const ensureAbsoluteUrl = (url) => {
      try {
        if (url.startsWith('http:') || url.startsWith('https:')) {
          return url;
        }
        return `https:${url}`;
      } catch (error) {
        return { error_message: `${error}` }
      }
  };
  
  // Use the function to ensure the URL is absolute
  const pdfUrl = ensureAbsoluteUrl(properties.pdf_url);
  const pdfPassword = properties.pdf_password || ""; // Campo opcional para senha
  
  console.log('Attempting to fetch PDF from URL:', pdfUrl);

  return fetch(pdfUrl)
    .then(response => {
      if (!response.ok) {
        return { error_message: `HTTP error! status: ${response.status}` };
      }
      return response.arrayBuffer();
    })
    .then(arrayBuffer => {
      const data = new Uint8Array(arrayBuffer);
      return getDocument({ data, password: pdfPassword }).promise;
    })
    .then(pdfDocument => {
      let text = '';
      
      function extractTextFromPage(pageNumber) {
        if (pageNumber > pdfDocument.numPages) {
          return Promise.resolve(text);
        }
        return pdfDocument.getPage(pageNumber).then(page => {
          return page.getTextContent({ normaliseWhitespace: true }).then(content => {
            let lastTransform = null;
            content.items.forEach(item => {
              if (lastTransform && Math.abs(item.transform[5] - lastTransform[5]) > 1) {
                text += '\n';
              }
              if (lastTransform && Math.abs(item.transform[5] - lastTransform[5]) > 20) {
                text += '\n';
              }
              lastTransform = item.transform;
              text += item.str;
            });
            text += '\n';
            return extractTextFromPage(pageNumber + 1);
          });
        });
      }
      
      return extractTextFromPage(1);
    })
    .then(text => {
      return { text: text };
    })
    .catch(error => {
      return { error_message: `${error}` };
    });
}

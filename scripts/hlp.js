const fs = require("fs"); 
const marked = require("marked"); 
let md = fs.readFileSync("help.md","utf8");
// якщо рядок md починається з символу BOM, прибрати його
if (md.charCodeAt(0) === 0xFEFF) {
    md = md.slice(1);
}
const html=
`<DOCTYPE html>
<html lang=\"uk\">
   <head>
   <meta charset=\"UTF-8\">
   <title>Help</title>
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
   <link rel="stylesheet" href="index.css"> 
   </head>
   <body>
   <main class="container">
   `+ marked.parse(md) + 
   `</main>
   </body>
</html>`; 
   
fs.writeFileSync("help.html", html);

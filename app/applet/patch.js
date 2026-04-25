import fs from 'fs';

const file = 'src/firebaseInterceptor.ts';
let code = fs.readFileSync(file, 'utf8');

const regexDocs = /await getDocs\(collection\(db,\s*'([^']+)'\)\)/g;
code = code.replace(regexDocs, "await getCachedDocs('$1')");

const regexQuery = /await getDocs\(query\(collection\(db,\s*'([^']+)'\),\s*where\('([^']+)',\s*'==',\s*([^)]+)\)\)\)/g;
code = code.replace(regexQuery, "new FilteredSnapshot((await getCachedDocs('$1')).docs.filter((d: any) => d.data()['$2'] == $3))"); 

fs.writeFileSync(file, code);
console.log("Patched!!");

// Verificação sem expor a chave nem solicitar geração de texto.
export default function handler(req,res){
  const origin=req.headers.origin;
  const allowedOrigin=process.env.FRONTEND_ORIGIN||'https://joaopaulogv.github.io';
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');
  if(origin===allowedOrigin)res.setHeader('Access-Control-Allow-Origin',origin);
  const allowed=!origin||origin===allowedOrigin;
  if(req.method==='OPTIONS')return res.status(allowed?204:403).end();
  if(!allowed)return res.status(403).json({ok:false,error:'Origem não permitida'});
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'Use GET'});
  return res.status(200).json({ok:true,configured:!!process.env.GEMINI_API_KEY});
}

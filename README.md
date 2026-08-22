# License Key Gate — Deploy Guide

## Kya hai isme
- `index.html` — user-facing page: key daalo, unlock ho, 2hr/din ka timer chale, khatam hote hi auto-lock
- `admin.html` — tumhare liye admin panel: keys generate karo, block/unblock karo, usage dekho
- `netlify/functions/` — backend (serverless functions), key verify/track/block sab yahin hota hai
- Data storage: **Netlify Blobs** (Netlify ka built-in database, koi alag signup nahi chahiye)

## Deploy kaise karein (Netlify pe)

1. Is poore folder ko GitHub repo mein push karo (ya Netlify CLI se seedha deploy karo).
2. Netlify dashboard → **Add new site → Import from GitHub** → apna repo select karo.
3. Build settings default rehne do (`netlify.toml` already configured hai).
4. Deploy hone ke baad: **Site settings → Environment variables** mein jaake ek naya variable add karo:
   - Key: `ADMIN_SECRET`
   - Value: koi bhi strong password jo sirf tumhe pata ho (jaise `H@san_2026_Admin!`)
5. Redeploy karo taaki env variable apply ho jaye.

## Use kaise karo

- **Apni asli service/website** pe `index.html` ka content embed kar do (ya isi page ko service ka gate bana do — jo cheez unlock karwani hai wo `.service-box` wale div mein daal do).
- **Admin panel** kholo: `yourdomain.netlify.app/admin.html`
  - Upar "Admin Secret" field mein wahi password daalo jo tumne env variable mein set kiya tha.
  - "Generate New Key" dabao — naya key milega, wo apne friend/user ko de do.
  - Kisi bhi key ko "Block" kar sakte ho instantly — wo user turant lock ho jayega (agla heartbeat check pe).

## Kaise kaam karta hai (time limit)

- Har key ka `dailyLimitSeconds` hota hai (default 2 ghante = 7200 seconds).
- Jab user key daalta hai → `verify-key` function check karta hai key valid hai, blocked nahi hai, aur aaj ka limit bacha hai.
- Har 20 second mein `heartbeat` function server ko batata hai ki kitna time beet gaya — **time tracking server-side hoti hai**, isliye user browser console se timer ko cheat/bypass nahi kar sakta.
- Roz raat 12 baje (UTC) usage reset ho jata hai, naya 2-ghante ka window shuru.

## Security note

- `ADMIN_SECRET` kabhi bhi frontend code mein hardcode mat karna — sirf Netlify env variable mein rakho, aur admin.html mein har baar manually enter karo (ya browser mein bookmark karke save kar lo apne paas).
- Agar chahiye toh main admin.html ko login-protected bhi bana sakta hoon (password localStorage mein remember kare) — bata dena.

# Cloudflare Setup for curl ellewsen.no

## 1. Move DNS to Cloudflare

- Create a free account at cloudflare.com
- Add site → enter `ellewsen.no`
- Cloudflare will scan and import your existing DNS records from domeneshop
- Copy the two Cloudflare nameservers it gives you
- Go to domeneshop → your domain → change nameservers to Cloudflare's two
- Wait for propagation (usually 1–4 hours)

## 2. Deploy the Worker

- In Cloudflare: **Workers & Pages** → **Create** → **Create Worker**
- Delete the placeholder code, paste the contents of `worker.js`
- Click **Deploy**
- Give it a name, e.g. `ellewsen-curl`

## 3. Attach it to your domain

- Go to your domain in Cloudflare → **Workers Routes** → **Add route**
- Route: `ellewsen.no/*`
- Worker: select `ellewsen-curl`
- Save

## 4. Test

```bash
curl ellewsen.no
```

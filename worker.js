/**
 * Cloudflare Worker for ellewsen.no
 *
 * - curl requests → styled terminal response
 * - everything else → proxied to GitHub Pages
 *
 * Deploy steps:
 *   1. Go to Workers & Pages in Cloudflare dashboard
 *   2. Create a new Worker, paste this script
 *   3. Add a route: ellewsen.no/* → this worker
 */

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const GREEN  = '\x1b[38;5;114m'
const YELLOW = '\x1b[38;5;221m'
const BLUE   = '\x1b[38;5;110m'
const GRAY   = '\x1b[38;5;245m'
const WHITE  = '\x1b[97m'

const B = s => `${BOLD}${s}${RESET}`
const G = s => `${GREEN}${s}${RESET}`
const Y = s => `${YELLOW}${s}${RESET}`
const L = s => `${BLUE}${s}${RESET}`
const D = s => `${GRAY}${s}${RESET}`
const W = s => `${WHITE}${s}${RESET}`

const CURL_RESPONSE = `
${G('███████╗██╗     ██╗     ███████╗██╗    ██╗███████╗███████╗███╗   ██╗')}
${G('██╔════╝██║     ██║     ██╔════╝██║    ██║██╔════╝██╔════╝████╗  ██║')}
${G('█████╗  ██║     ██║     █████╗  ██║ █╗ ██║███████╗█████╗  ██╔██╗ ██║')}
${G('██╔══╝  ██║     ██║     ██╔══╝  ██║███╗██║╚════██║██╔══╝  ██║╚██╗██║')}
${G('███████╗███████╗███████╗███████╗╚███╔███╔╝███████║███████╗██║ ╚████║')}
${G('╚══════╝╚══════╝╚══════╝╚══════╝ ╚══╝╚══╝ ╚══════╝╚══════╝╚═╝  ╚═══╝')}

  ${W(B('Andreas Ellewsen'))}  ${D('·')}  ${D('software_developer')}

  ${D('MSc Astronomy, University of Oslo (2018)')}
  ${D('Software Developer @ Itera · prev 5+ yrs @ UiO')}

  ${D('────────────────────────────────────────────')}

  ${Y('stack')}    ${W('Python')}  ${W('React')}  ${W('Svelte')}  ${W('TypeScript')}
            ${D('PostgreSQL · REST APIs · Docker · Linux')}

  ${Y('interests')}  ${D('backend arch · API design · video games')}
            ${D('· occasionally gazing at stars')}

  ${D('────────────────────────────────────────────')}

  ${G('recent posts')}

  ${W('2026-03-05')}  ${L('Rewriting the site with Claude')}
  ${W('2025-07-25')}  ${L('More utils')}
  ${W('2025-07-24')}  ${L('Ipv6 support for IP Range Calculator')}
  ${W('2025-07-23')}  ${L('Ip Range Calculator')}
  ${W('2025-07-19')}  ${L('BMI calculator')}

  ${D('────────────────────────────────────────────')}

  ${D('web')}   ${W('https://ellewsen.no')}
  ${D('posts')} ${W('https://ellewsen.no/posts')}
  ${D('utils')} ${W('https://ellewsen.no/utils')}

`

export default {
  async fetch(request) {
    const ua = request.headers.get('User-Agent') || ''

    if (ua.toLowerCase().includes('curl')) {
      return new Response(CURL_RESPONSE, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return fetch(request)
  },
}

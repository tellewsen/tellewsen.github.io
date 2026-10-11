import{B as e,I as t,J as n,Q as r,R as i,W as a,a as o,dt as s,et as c,ft as l,mt as u,nt as d,pt as f,rt as p,t as m}from"../chunks/DLf_x080.js";import"../chunks/CyxlzONq.js";import{t as h}from"../chunks/B1cA56Uh.js";import{t as g}from"../chunks/BljFOS5y.js";var _=e(`<article><h1> </h1> <small><!></small> <hr/> <p>A colleague asked me what the shape of the sun's path through the sky over a year is called. I
		have a master's in astronomy, so this is the kind of thing I should know. The best I could come
		up with was that it had to be some kind of helix, but I wasn't sure that was the correct
		mathematical term for the curve. So I asked Claude Code to work it out, and it built a <a href="/utils/sun">page</a> for it.</p> <p>The pieces that do have names are the day and the fixed clock time. Over a single day the sun
		moves along a <i>diurnal circle</i> centred on the celestial pole. Over a year those circles join
		up into a coil wound around the sky between the two tropics: about 182 turns climbing north, then
		182 back down. Earth's tilt drives it up and down. The turns are spread out at the equinoxes and pile
		up at the solstices, which is literally what "solstice" means: the sun standing still. The elliptical
		orbit makes the climb uneven, so the northern spring and summer last 186 days and autumn and winter
		179.</p> <p>So is it a helix? Informally, yes, and that's what the page calls it. Strictly, no. In
		mathematics a helix keeps a constant angle to its axis, like a spring. This curve is wound on a
		sphere rather than a cylinder, its slant changes through the year, and it turns around at each
		solstice. There doesn't seem to be a standard name for the whole-year curve. So "helix" wasn't
		the right term, and there isn't a better one to give my colleague.</p> <p>The shape people usually mean is a different one. If you look at the sun at the same clock time
		every day you get the <a href="https://en.wikipedia.org/wiki/Analemma">analemma</a>, a figure-8,
		because the sun runs up to 14 minutes behind the clock in February and 16 minutes ahead in early
		November. The tilt alone would make a symmetric figure-8 (a curve called the lemniscate of
		Gerono). The eccentricity is what makes one loop bigger than the other.</p> <p>The page lets you pick a place and a date, then drag a 3D sky dome around to look at the day's
		circle, the year's coil and the analemma. There are sliders for "what if Earth had no tilt" or
		"a more elliptical orbit". Setting the tilt to zero flattens the coil onto the equator; setting
		the eccentricity to zero makes the analemma symmetric. Below the charts is the full derivation,
		from Kepler's equation to altitude and azimuth.</p> <p>The code and the derivation follow standard references (Meeus's <i>Astronomical Algorithms</i> and Smart's <i>Textbook on Spherical Astronomy</i>, among others,
		listed on the page), and the results were checked against NASA JPL's <a href="https://ssd.jpl.nasa.gov/horizons/">Horizons</a> ephemeris at 235 dates and four places.
		The worst disagreement was about 0.01°, roughly a fiftieth of the sun's width, and those comparisons
		now run as part of the site's tests.</p></article>`);function v(e,g){l(g,!1);let v=m(g,`data`,8);o();var y=_(),b=c(y),x=d(b,!0),S=p(b,2),C=c(S);h(C,{get iso(){return a(v()),n(()=>v().metadata.date)}}),u(S),f(14),u(y),r(()=>t(x,(a(v()),n(()=>v().metadata.title)))),i(e,y),s()}export{v as component,g as universal};
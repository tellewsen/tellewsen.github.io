<script lang="ts">
	// The working-out behind src/lib/sun/sun.ts. Section numbers match the
	// § comments there.
	import T from './Tex.svelte';
</script>

<article class="derivation">
	<h2>The mathematics</h2>
	<p>
		To get from "Earth orbits the sun" to "the sun is at this altitude and azimuth" takes three
		rotations, each with its own clock:
	</p>
	<ol>
		<li>
			<b>The orbit</b> (one year): where the sun is along its yearly track, the <i>ecliptic</i>. The
			eccentricity makes this motion uneven.
		</li>
		<li>
			<b>The tilt</b> (fixed): the ecliptic is tilted by
			<T tex={String.raw`\varepsilon \approx 23.44^\circ`} /> against the celestial equator. This turns
			the position along the ecliptic into declination and right ascension.
		</li>
		<li>
			<b>The spin</b> (one day): Earth turns under the sky. Your latitude sets which way your horizon
			faces on the spinning sphere.
		</li>
	</ol>
	<p>
		All directions are unit vectors on the <i>celestial sphere</i>: a sphere of radius 1 centred on
		you. The sun is far enough away that moving around on Earth doesn't change its direction
		noticeably (parallax ≈ 9″), so a single sphere works for everyone.
	</p>

	<h3>§1 Mean motion</h3>
	<p>
		Seen from Earth, the sun goes once around the ecliptic per year, in the same sense as Earth goes
		around the sun. If the orbit were a circle it would move at the constant rate
		<T tex={String.raw`360^\circ / 365.2596\ \text{d} \approx 0.9856^\circ/\text{d}`} />. That
		uniform angle, counted from perihelion (closest approach, around 3 January), is the
		<i>mean anomaly</i>:
	</p>
	<T d tex={String.raw`M = 357.5291^\circ + 0.98560028^\circ\, n`} />
	<p>
		Here <T tex="n" /> is days since 2000-01-01 12:00 UT (J2000). The direction of perihelion along the
		ecliptic is <T tex={String.raw`\varpi \approx 282.94^\circ`} />, measured from the March equinox
		point. Adding the two gives the <i>mean longitude</i>
		<T tex={String.raw`L = \varpi + M`} />: where a sun moving at constant speed would be. Mean
		solar time, and so our clocks, are built on <T tex="L" />.
	</p>

	<h3>§2 The orbit is an ellipse: Kepler</h3>
	<p>
		The actual angle from perihelion is the <i>true anomaly</i>
		<T tex={String.raw`\nu`} />. On the ellipse
	</p>
	<T d tex={String.raw`r = \frac{a(1-e^2)}{1+e\cos\nu}`} />
	<p>
		Kepler's second law (equal areas in equal times) is conservation of angular momentum,
		<T tex={String.raw`r^2\dot\nu = \text{const}`} />. So the sun's apparent motion is fastest at
		perihelion:
	</p>
	<T
		d
		tex={String.raw`\dot\nu = \bar\omega\,\frac{(1+e\cos\nu)^2}{(1-e^2)^{3/2}},\qquad \bar\omega = \dot M`}
	/>
	<p>
		That is about 1.019°/day in January and 0.953°/day in July. To find <T tex={String.raw`\nu`} />
		at a given time, add the <i>eccentric anomaly</i>
		<T tex="E" />, an angle measured on the circle around the ellipse. The area law becomes
		<i>Kepler's equation</i>:
	</p>
	<T
		d
		tex={String.raw`M = E - e\sin E, \qquad \tan\frac{\nu}{2} = \sqrt{\frac{1+e}{1-e}}\,\tan\frac{E}{2}`}
	/>
	<p>
		The code solves the first equation exactly with Newton's method,
		<T tex={String.raw`E \leftarrow E - (E - e\sin E - M)/(1 - e\cos E)`} />. That works for any
		<T tex="e" /> you choose with the slider. For Earth, <T tex={String.raw`e \approx 0.0167`} /> is small,
		so expanding to first order shows what is going on. From Kepler's equation,
		<T tex={String.raw`E \approx M + e\sin M`} />. Expanding the tangent relation gives
		<T tex={String.raw`\nu \approx E + e\sin E`} />. Together:
	</p>
	<T
		d
		tex={String.raw`\nu = M + \underbrace{2e\sin M + \tfrac54 e^2 \sin 2M + O(e^3)}_{C,\ \text{the equation of centre}}`}
	/>
	<p>
		The sun's ecliptic longitude is then
		<T tex={String.raw`\lambda = \varpi + \nu = L + C`} />. For Earth the leading term
		<T tex="2e" /> is 0.0334 rad = 1.915°: the real sun runs up to about 2° ahead of or behind the uniform
		one, with a period of one year.
	</p>
	<p>
		<b>The seasons have unequal lengths.</b> The sun is at the March equinox when
		<T tex={String.raw`\lambda = 0^\circ`} /> and at the September equinox when
		<T tex={String.raw`\lambda = 180^\circ`} />, that is
		<T tex={String.raw`\nu = 77.06^\circ`} /> and <T tex={String.raw`257.06^\circ`} />. Inverting
		the series, <T tex={String.raw`M \approx \nu - 2e\sin\nu`} />, gives
		<T tex={String.raw`M = 75.19^\circ`} /> and <T tex={String.raw`258.93^\circ`} />. The difference
		is <T tex={String.raw`\Delta M = 183.74^\circ`} />, which is
		<T tex={String.raw`183.74/360 \times 365.26 = 186.4`} /> days. The northern spring and summer last
		186.4 days; autumn and winter last 178.8.
	</p>

	<h3>§3 The tilt: from the ecliptic to the equator</h3>
	<p>
		Put the <T tex="x" /> axis toward the March equinox, which lies on both the ecliptic and the celestial
		equator. In ecliptic coordinates the sun's direction is
		<T tex={String.raw`\hat u = (\cos\lambda, \sin\lambda, 0)`} />. The equatorial frame is the
		ecliptic frame rotated by <T tex={String.raw`\varepsilon`} /> about that shared <T tex="x" /> axis:
	</p>
	<T
		d
		tex={String.raw`\begin{pmatrix}\cos\delta\cos\alpha\\ \cos\delta\sin\alpha\\ \sin\delta\end{pmatrix}
= \begin{pmatrix}1&0&0\\0&\cos\varepsilon&-\sin\varepsilon\\0&\sin\varepsilon&\cos\varepsilon\end{pmatrix}
\begin{pmatrix}\cos\lambda\\ \sin\lambda\\ 0\end{pmatrix}
= \begin{pmatrix}\cos\lambda\\ \cos\varepsilon\sin\lambda\\ \sin\varepsilon\sin\lambda\end{pmatrix}`}
	/>
	<p>
		Comparing components gives the sun's declination <T tex={String.raw`\delta`} /> (latitude on the sky)
		and right ascension <T tex={String.raw`\alpha`} /> (longitude on the sky):
	</p>
	<T
		d
		tex={String.raw`\boxed{\sin\delta = \sin\varepsilon\,\sin\lambda}, \qquad \boxed{\tan\alpha = \cos\varepsilon\,\tan\lambda}`}
	/>
	<p>This is the up-and-down part of the spiral. Its rate is found by differentiating:</p>
	<T
		d
		tex={String.raw`\cos\delta\,\dot\delta = \sin\varepsilon\cos\lambda\,\dot\lambda
\;\Rightarrow\;
\dot\delta \approx \begin{cases} \sin\varepsilon \cdot 0.9856^\circ/\text{d} = 0.39^\circ/\text{d} & \text{at the equinoxes } (\lambda = 0^\circ, 180^\circ)\\ 0 & \text{at the solstices } (\lambda = \pm 90^\circ)\end{cases}`}
	/>

	<h3>§4 The spin, and the equation of time</h3>
	<p>
		The <i>hour angle</i>
		<T tex="H" /> is how far the sky has turned since the sun crossed your meridian (your local north–south
		line). It is 0 at local noon and positive in the afternoon, and it grows by 15° per hour. Clock time
		is defined by the uniform sun at <T tex="L" />. The hour angle of that <i>mean</i> sun at UT
		hour <T tex="t" /> and east longitude
		<T tex={String.raw`\ell`} /> is
	</p>
	<T d tex={String.raw`H_\text{mean} = 15^\circ(t - 12\,\text{h}) + \ell`} />
	<p>
		Hour angle is measured along the <i>equator</i>, and the mean sun sits at right ascension
		<T tex="L" />. The real sun sits at <T tex={String.raw`\alpha`} />, so its hour angle differs by
		the angle between the two:
	</p>
	<T
		d
		tex={String.raw`H = H_\text{mean} + \underbrace{(L - \alpha)}_{\text{EoT}}
= H_\text{mean} + \underbrace{(L - \lambda)}_{\text{eccentricity}} + \underbrace{(\lambda - \alpha)}_{\text{tilt}}`}
	/>
	<p>
		This is the <b>equation of time</b>: how far a sundial runs ahead of the clock (1° = 4 min). The
		eccentricity term is <T tex={String.raw`-C \approx -2e\sin M`} /> from §2. For the tilt term, set
		<T tex={String.raw`y = \tan^2(\varepsilon/2)`} />, so that
		<T tex={String.raw`\cos\varepsilon = \frac{1-y}{1+y}`} />, and write the relation
		<T tex={String.raw`\tan\alpha = \cos\varepsilon\tan\lambda`} /> with complex exponentials:
	</p>
	<T
		d
		tex={String.raw`e^{2i\alpha} = \frac{\cos\lambda + i\cos\varepsilon\sin\lambda}{\cos\lambda - i\cos\varepsilon\sin\lambda}
= e^{2i\lambda}\,\frac{1 + y\,e^{-2i\lambda}}{1 + y\,e^{2i\lambda}}`}
	/>
	<p>
		Take logarithms and use <T tex={String.raw`\ln(1+z) = z - z^2/2 + \dots`} />:
	</p>
	<T
		d
		tex={String.raw`\lambda - \alpha = y\sin 2\lambda - \tfrac{y^2}{2}\sin 4\lambda + \tfrac{y^3}{3}\sin 6\lambda - \dots`}
	/>
	<p>So, to leading order, with 1 rad of hour angle = 229.2 minutes:</p>
	<T
		d
		tex={String.raw`\text{EoT} \approx \underbrace{-7.66\,\text{min}\cdot\sin M}_{\text{eccentricity: period 1 year}} + \underbrace{9.87\,\text{min}\cdot\sin 2\lambda}_{\text{tilt: period half a year}}`}
	/>
	<p>
		The two waves add to the familiar curve, which peaks at about −14 min in mid-February and +16
		min in early November. The <a href="#eot-chart">equation of time chart</a> above shows the two parts
		and their sum.
	</p>

	<h3>§5 Turning the sky onto your horizon</h3>
	<p>
		Use a frame fixed to your horizon: <T tex={String.raw`\hat x`} /> east, <T
			tex={String.raw`\hat y`}
		/> north, <T tex={String.raw`\hat z`} /> up. At latitude <T tex={String.raw`\varphi`} /> the celestial
		pole stands <T tex={String.raw`\varphi`} /> above the north horizon. The point where the celestial
		equator crosses your meridian is <T tex={String.raw`90^\circ - \varphi`} /> above the south horizon,
		and east is east in both frames:
	</p>
	<T
		d
		tex={String.raw`\hat e_P = (0,\ \cos\varphi,\ \sin\varphi),\qquad
\hat e_M = (0,\ -\sin\varphi,\ \cos\varphi),\qquad
\hat e_E = (1,\ 0,\ 0)`}
	/>
	<p>
		With <T tex="H" /> increasing westward, the sun is at
		<T
			tex={String.raw`\hat s = \cos\delta\cos H\,\hat e_M - \cos\delta\sin H\,\hat e_E + \sin\delta\,\hat e_P`}
		/>, which is:
	</p>
	<T
		d
		tex={String.raw`\hat s = \begin{pmatrix} -\cos\delta\sin H \\ \cos\varphi\sin\delta - \sin\varphi\cos\delta\cos H \\ \sin\varphi\sin\delta + \cos\varphi\cos\delta\cos H\end{pmatrix}`}
	/>
	<p>The altitude and azimuth (0° = north, 90° = east) follow:</p>
	<T
		d
		tex={String.raw`\sin h = \sin\varphi\sin\delta + \cos\varphi\cos\delta\cos H, \qquad
A = \operatorname{atan2}(s_x,\ s_y)`}
	/>
	<p>
		Longitude appears only inside <T tex="H" />. Moving east or west shifts the time of day but not
		the shape of the paths.
	</p>

	<h3>§6 What shape is it?</h3>
	<p>
		<b>One day: a circle.</b> Over a day <T tex={String.raw`\delta`} /> is almost constant, so
		<T tex={String.raw`\hat s \cdot \hat e_P = \sin\delta`} /> is fixed. The sun stays on the plane perpendicular
		to the pole axis at height <T tex={String.raw`\sin\delta`} />. That plane cuts the sphere in a
		small circle of radius <T tex={String.raw`\cos\delta`} />, tilted
		<T tex={String.raw`90^\circ - \varphi`} /> from the horizon. Sunrise and sunset are where it crosses
		altitude <T tex={String.raw`h_0 = -0.833^\circ`} /> (refraction plus the sun's radius):
	</p>
	<T
		d
		tex={String.raw`\cos H_0 = \frac{\sin h_0 - \sin\varphi\sin\delta}{\cos\varphi\cos\delta}
\;\approx\; -\tan\varphi\tan\delta, \qquad \text{day length} = \frac{2H_0}{15^\circ/\text{h}}`}
	/>
	<p>
		If the right-hand side is below −1 the circle never goes down: the midnight sun, when
		<T tex={String.raw`|\varphi| > 90^\circ - |\delta|`} /> on the summer side. If it is above +1 the
		circle never comes up: polar night.
	</p>
	<p>
		<b>One year: a helix wound on the sphere.</b> Put the slow and fast motions together. Around the
		pole axis the angle <T tex="H" /> grows almost uniformly, one turn per day. The height along the axis,
		<T tex={String.raw`\sin\delta = \sin\varepsilon\sin\lambda(t)`} />, swings once a year:
	</p>
	<T
		d
		tex={String.raw`\hat s(t) = \cos\delta(t)\big[\cos H(t)\,\hat e_M - \sin H(t)\,\hat e_E\big] + \sin\delta(t)\,\hat e_P,
\qquad H \approx 2\pi\,\tfrac{t}{1\,\text{day}},\quad \delta \approx \varepsilon \sin\tfrac{2\pi t}{1\,\text{year}}`}
	/>
	<p>
		Informally this is a helix: a coil wound on the sphere between the two tropics
		<T tex={String.raw`\delta = \pm\varepsilon`} />. Strictly it isn't one. A helix keeps a constant
		angle to its axis, while this curve's slant changes through the year and reverses at the
		solstices, and it has no standard name of its own. It winds about 182.6 turns up and 182.6 turns
		back down. The coil isn't evenly spaced: from §3, the gap between turns is about 0.39° near the
		equinoxes and shrinks to nothing at the solstices, where the turns pile up. That pile-up is what
		"solstice" (<i>sol stitium</i>, sun standing still) refers to. The eccentricity makes the climb
		north take 186.4 days and the return 178.8 (§2). There are 365.2422 turns in a year, so the coil
		doesn't close. Each year starts about a quarter turn (≈ 6 h) later, and leap days reset it.
		Without the tilt (<T tex={String.raw`\varepsilon = 0`} />) the helix flattens onto the celestial
		equator. Try the tilt slider. The "turns per year" slider spaces out the coil so you can see the
		spiral.
	</p>
	<p>
		<b>Same clock time every day: the analemma.</b> Sampling at a fixed clock time removes the fast
		spin, because <T tex={String.raw`H_\text{mean}`} /> is the same at every sample. What is left is the
		slow wobble:
	</p>
	<T
		d
		tex={String.raw`(H - H_\text{mean},\ \delta) \approx \big(\,y\sin 2\lambda - 2e\sin M,\ \ \varepsilon\sin\lambda\,\big)`}
	/>
	<p>
		With a circular orbit (<T tex="e = 0" />) this is a 2 : 1 Lissajous curve. Write
		<T tex={String.raw`u = \sin\lambda`} />: the horizontal coordinate is
		<T tex={String.raw`y\sin 2\lambda = 2y\,u\cos\lambda = \pm 2y\,u\sqrt{1-u^2}`} />, so
		<T tex={String.raw`x^2 \propto u^2(1-u^2)`} />. This is the <i>lemniscate of Gerono</i>, a
		symmetric figure-8 that crosses itself at the equinoxes. The eccentricity adds a term with a
		period of one year. Near perihelion (January) both terms push the same way, so the southern
		(December) lobe grows and the northern (June) lobe shrinks. §5 then projects this onto your sky,
		tilted by your latitude.
	</p>

	<h3>§7 Constants used</h3>
	<div class="table-wrap">
		<table>
			<tbody>
				<tr>
					<td>Obliquity (axial tilt)</td>
					<td><T tex={String.raw`\varepsilon = 23.4393^\circ`} /></td>
					<td>Schlyter</td>
				</tr>
				<tr>
					<td>Eccentricity</td>
					<td><T tex="e = 0.016709" /></td>
					<td>Schlyter</td>
				</tr>
				<tr>
					<td>Mean anomaly</td>
					<td><T tex={String.raw`M = 357.5291^\circ + 0.98560028^\circ\,n`} /></td>
					<td>Strous</td>
				</tr>
				<tr>
					<td>Longitude of perihelion</td>
					<td><T tex={String.raw`\varpi = 282.9404^\circ + 4.70935\cdot10^{-5}\,{}^\circ n`} /></td>
					<td>Schlyter</td>
				</tr>
				<tr>
					<td>Rise / set altitude</td>
					<td><T tex={String.raw`h_0 = -0.833^\circ`} /></td>
					<td>Meeus, ch. 15</td>
				</tr>
			</tbody>
		</table>
	</div>

	<h3>§8 How accurate is it?</h3>
	<p>
		These are low-precision formulas. They leave out nutation (Earth's axis nodding with an
		18.6-year period), annual aberration (the 20″ shift from Earth's own motion), and the Moon's
		pull on Earth. They also leave out atmospheric refraction, except in the sunrise and sunset
		altitude. To see what that costs, the model was compared with NASA JPL's
		<a href="https://ssd.jpl.nasa.gov/horizons/">Horizons</a> ephemeris at 235 dates. The comparison covered
		Oslo, Tromsø, Quito and Sydney once a week through 2026, at different times of day, plus Oslo once
		a month in 1960 and 2045. The worst disagreements were:
	</p>
	<div class="table-wrap">
		<table>
			<tbody>
				<tr><td>Declination</td><td>0.009°</td></tr>
				<tr><td>Altitude</td><td>0.011°</td></tr>
				<tr><td>Hour angle (equation of time)</td><td>0.010° = 2.4 s of time</td></tr>
				<tr><td>Azimuth</td><td>0.025° (with the sun 79° up; it grows near the zenith)</td></tr>
			</tbody>
		</table>
	</div>
	<p>
		That is about a fiftieth of the sun's diameter. These comparisons are part of the site's test
		suite.
	</p>

	<h3>Sources</h3>
	<ul class="sources">
		<li>
			Jean Meeus, <i>Astronomical Algorithms</i>, 2nd ed., Willmann-Bell, 1998. Chapters 13
			(coordinate transformations), 15 (rising and setting), 25 (solar coordinates), 28 (equation of
			time) and 30 (Kepler's equation).
		</li>
		<li>
			W. M. Smart, <i>Textbook on Spherical Astronomy</i>, 6th ed., revised by R. M. Green,
			Cambridge University Press, 1977. The celestial sphere, hour angle, and the equation of time
			series in
			<T tex={String.raw`y = \tan^2(\varepsilon/2)`} />.
		</li>
		<li>
			C. D. Murray and S. F. Dermott, <i>Solar System Dynamics</i>, Cambridge University Press,
			1999. Chapter 2: the two-body problem and the series for the true anomaly.
		</li>
		<li>
			Paul Schlyter, <a href="https://www.stjarnhimlen.se/comp/ppcomp.html"
				><i>How to compute planetary positions</i></a
			>. Source of <T tex={String.raw`\varepsilon`} />, <T tex="e" /> and <T
				tex={String.raw`\varpi`}
			/>.
		</li>
		<li>
			Louis Strous, <a href="https://aa.quae.nl/en/reken/zonpositie.html"
				><i>Astronomy Answers: Position of the Sun</i></a
			>. Source of the mean anomaly <T tex="M" />.
		</li>
		<li>
			NASA JPL, <a href="https://ssd.jpl.nasa.gov/horizons/"><i>Horizons System</i></a>. The
			reference positions used to check the model (§8).
		</li>
	</ul>
</article>

<style>
	.derivation {
		font-size: 13px;
		line-height: 1.7;
		max-width: 760px;
	}
	h2 {
		font-size: 20px;
		margin-bottom: 12px;
	}
	h3 {
		font-size: 15px;
		margin: 28px 0 8px;
		color: var(--accent);
	}
	ol {
		padding-left: 20px;
		margin-bottom: 1rem;
	}
	li {
		margin-bottom: 4px;
	}
	b {
		color: var(--bright);
		font-weight: 600;
	}
	.derivation :global(.katex) {
		font-size: 1.08em;
		color: var(--bright);
	}
	.derivation :global(.katex-display) {
		margin: 0.6em 0 1em;
	}
	.table-wrap {
		overflow-x: auto;
		margin-bottom: 1rem;
	}
	table {
		border-collapse: collapse;
	}
	td {
		padding: 4px 16px 4px 0;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
	}
	.sources {
		padding-left: 18px;
		color: var(--muted);
		font-size: 12px;
	}
	.sources li {
		margin-bottom: 6px;
	}
</style>

import{B as e,I as t,J as n,Q as r,R as i,W as a,a as o,dt as s,et as c,ft as l,mt as u,nt as d,pt as f,rt as p,t as m}from"../chunks/DLf_x080.js";import"../chunks/CyxlzONq.js";import{t as h}from"../chunks/B1cA56Uh.js";import{t as g}from"../chunks/Ciz-8uDj.js";var _=e(`<article><h1> </h1> <small><!></small> <hr/> <p>I've known the algorithms for solving a regular Rubik's cube for years. Recently I came across
		the <a href="https://en.wikipedia.org/wiki/Pyramorphix#Master_Pyramorphix">Master Pyramorphix</a> (informally the Mastermorphix, sold commercially by Uwe Mèffert), and I still can't make any sense
		of it.</p> <p>It's a shape mod of the 3x3: the same mechanism with the same moves, just cut into a
		tetrahedron. Pieces change shape as you turn it, and several of them look identical. Since it's
		a 3x3 underneath, I started with a regular <a href="/utils/cube">cube solver</a>: paint the
		stickers, get a solution.</p> <p>The solver uses Herbert Kociemba's <a href="https://en.wikipedia.org/wiki/Optimal_solutions_for_the_Rubik%27s_Cube#Kociemba's_algorithm">two-phase algorithm</a> from 1992. The first phase gets the cube into a smaller set of positions that can be solved with only
		a few kinds of moves; the second phase finishes from there. Both phases search using precomputed distance
		tables. The code is a TypeScript implementation written with Claude Code. It isn't copied from Kociemba's <a href="https://github.com/hkociemba/RubiksCube-TwophaseSolver">own solver</a>, but it follows
		his published conventions closely, and the algorithm is entirely his.</p> <p>The <a href="/utils/mastermorphix">Mastermorphix solver</a> needed two additions. The two-colour edge
		pieces are the cube's centers, and on this puzzle you can see which way they're turned, so the solver
		also has to solve center orientation, as on a "supercube". And because some pieces look alike, the
		page works out which real cube positions match what you entered before solving. The 3D model comes
		from taking each piece of a 3x3 and cutting it with a tetrahedron.</p> <p>I still don't understand the puzzle. I just follow the steps.</p> <p>At least I don't have to look at this monstrosity of a cube when I give up on solving it any
		more.</p></article>`);function v(e,g){l(g,!1);let v=m(g,`data`,8);o();var y=_(),b=c(y),x=d(b,!0),S=p(b,2),C=c(S);h(C,{get iso(){return a(v()),n(()=>v().metadata.date)}}),u(S),f(14),u(y),r(()=>t(x,(a(v()),n(()=>v().metadata.title)))),i(e,y),s()}export{v as component,g as universal};
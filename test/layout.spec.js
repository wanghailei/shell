import { test, expect } from "@playwright/test"
import { fileURLToPath } from "node:url"

// example.html is served from the repository at http://shell.test/, without a server: a module script does not load from file://.
const ROOT = fileURLToPath( new URL( "..", import.meta.url ) )

test.beforeEach( async ( { page } ) => {
	await page.route( "http://shell.test/**", route => route.fulfill( { path: ROOT + new URL( route.request().url() ).pathname } ) )
	await page.goto( "http://shell.test/example.html" )
} )

// Where each column starts and how wide it is, in CSS pixels.
async function columns( page ) {
	return page.evaluate( () => Object.fromEntries( [ "menu", "main", "side", "more" ].map( id => {
		const box = document.getElementById( id )?.getBoundingClientRect()
		return [ id, box && { left: box.left, width: box.width } ]
	} ) ) )
}

async function settle( page ) {
	await page.waitForTimeout( 400 )    // the layouts slide for 0.2s
}

// The window is 1728 × 1117. Inside the shell's own 1px border the columns have 1726 × 1115, from (1, 1).
const INSIDE = 1726

// Menu 240px; side alone takes half of what the menu leaves, up to 864px; side and more take 33% each.
const BOTH = INSIDE * 0.33
const WIDTHS = {
	"show-main": { menu: 0, main: INSIDE, side: 0, more: 0 },
	"show-menu-main": { menu: 240, main: INSIDE - 240, side: 0, more: 0 },
	"show-main-side": { menu: 0, main: INSIDE / 2, side: INSIDE / 2, more: 0 },
	"show-menu-main-side": { menu: 240, main: ( INSIDE - 240 ) / 2, side: ( INSIDE - 240 ) / 2, more: 0 },
	"show-main-side-more": { menu: 0, main: INSIDE - 2 * BOTH, side: BOTH, more: BOTH },
	"show-menu-main-side-more": { menu: 240, main: INSIDE - 240 - 2 * BOTH, side: BOTH, more: BOTH },
}

for( const [ layout, widths ] of Object.entries( WIDTHS ) ) {
	test( `${ layout } shows its columns side by side at their widths`, async ( { page } ) => {
		await page.evaluate( layout => document.getElementById( "shell" ).className = layout, layout )
		await settle( page )
		const shown = await columns( page )
		let left = 1
		for( const id of [ "menu", "main", "side", "more" ] ) {
			// A hidden column keeps only its 1px border, which falls outside the page or under the column beside it.
			if( widths[ id ] === 0 ) expect( shown[ id ].width, id ).toBeLessThanOrEqual( 1 )
			else {
				expect( shown[ id ].width, id ).toBeCloseTo( widths[ id ], 0 )
				expect( shown[ id ].left, id ).toBeCloseTo( left, 0 )
			}
			left += widths[ id ]
		}
	} )
}

test( "the buttons open and close the columns", async ( { page } ) => {
	const main = page.locator( "#main" )
	await main.getByRole( "button", { name: "toggleMenu" } ).click()
	await settle( page )
	expect( ( await columns( page ) ).menu.width ).toBeLessThanOrEqual( 1 )

	await main.getByRole( "button", { name: "showMore" } ).click()
	await settle( page )
	let shown = await columns( page )
	expect( shown.side.width ).toBeGreaterThan( 400 )
	expect( shown.more.width ).toBeGreaterThan( 400 )

	await page.locator( "#side" ).getByTitle( "Close side" ).click()
	await settle( page )
	shown = await columns( page )
	expect( shown.side.width ).toBeLessThanOrEqual( 1 )
	expect( shown.more.width ).toBeLessThanOrEqual( 1 )
	await expect( page.locator( "#layout" ) ).toHaveText( "#shell has the class show-main." )
} )

test( "only the body scrolls; the head, neck and foot stay where they are", async ( { page } ) => {
	const head = page.locator( "#main .head" )
	const before = await head.boundingBox()
	await page.locator( "#main .body" ).hover()
	await page.mouse.wheel( 0, 2000 )
	await expect.poll( () => page.locator( "#main .body" ).evaluate( body => body.scrollTop ) ).toBeGreaterThan( 0 )
	expect( await head.boundingBox() ).toEqual( before )
	expect( await page.evaluate( () => document.scrollingElement.scrollTop ) ).toBe( 0 )
	const foot = await page.locator( "#main .foot" ).boundingBox()
	expect( foot.y + foot.height ).toBeCloseTo( 1116, 0 )
} )

test( "titles and text sit one base space in from their column's edges, under a reset in an earlier layer", async ( { page } ) => {
	await page.evaluate( () => document.getElementById( "shell" ).className = "show-menu-main-side" )
	await settle( page )
	for( const id of [ "menu", "main", "side" ] ) {
		// A column's edges are inside its border: the border is the line the eye takes as the edge.
		const column = await page.locator( `#${ id }` ).evaluate( column => {
			const box = column.getBoundingClientRect()
			return { left: box.left + column.clientLeft, right: box.left + column.clientLeft + column.clientWidth }
		} )
		// A block as wide as the body allows, to find where the body's content ends on the right.
		await page.locator( `#${ id } .body` ).evaluate( body => body.insertAdjacentHTML( "afterbegin", "<div class=\"full\">&nbsp;</div>" ) )
		// A head's title sits one base space in on the left, and one base space in for each icon cell after it on the right.
		const after = Math.max( 1, await page.locator( `#${ id } .head > *` ).count() - 2 )
		const title = await page.locator( `#${ id } .head > :nth-child(2)` ).boundingBox()
		expect( title.x - column.left, `${ id } head title, left` ).toBeCloseTo( 40, 0 )
		expect( column.right - ( title.x + title.width ), `${ id } head title, right` ).toBeCloseTo( 40 * after, 0 )
		const boxes = {
			"neck text": await page.locator( `#${ id } .neck > :nth-child(2)` ).boundingBox(),
			"foot text": await page.locator( `#${ id } .foot > :nth-child(2)` ).boundingBox(),
			"body content": await page.locator( `#${ id } .body .full` ).boundingBox(),
		}
		for( const [ name, box ] of Object.entries( boxes ) ) {
			expect( box.x - column.left, `${ id } ${ name }, left` ).toBeCloseTo( 40, 0 )
			expect( column.right - ( box.x + box.width ), `${ id } ${ name }, right` ).toBeCloseTo( 40, 0 )
		}
	}
} )

test( "a page with no reset and no styles of its own still scrolls only in a body", async ( { page } ) => {
	await page.route( "http://shell.test/bare.html", route => route.fulfill( { contentType: "text/html", body: `<!DOCTYPE html>
		<link rel="stylesheet" href="shell.css">
		<div id="shell" class="show-main"><main id="main">
			<div class="head"></div><div class="neck"></div>
			<div class="body">${ "<p>A line.</p>".repeat( 200 ) }</div>
			<div class="foot"></div>
		</main></div>` } ) )
	await page.goto( "http://shell.test/bare.html" )
	const size = await page.evaluate( () => ( { width: document.scrollingElement.scrollWidth, height: document.scrollingElement.scrollHeight } ) )
	expect( size ).toEqual( { width: 1728, height: 1117 } )
	expect( await page.locator( "#main" ).boundingBox() ).toEqual( { x: 1, y: 1, width: 1726, height: 1115 } )
} )

test( "the keyboard reaches only the columns that show", async ( { page } ) => {
	await page.evaluate( () => document.getElementById( "shell" ).className = "show-main" )
	await settle( page )
	const reached = new Set()
	for( let press = 0; press < 20; press++ ) {
		await page.keyboard.press( "Tab" )
		reached.add( await page.evaluate( () => document.activeElement.closest( "#menu, #main, #side, #more" )?.id ?? "none" ) )
	}
	expect( [ ...reached ].filter( id => id !== "none" ) ).toEqual( [ "main" ] )

	await page.locator( "#main" ).getByRole( "button", { name: "showSide" } ).click()
	await settle( page )
	await page.locator( "#side" ).getByTitle( "Close side" ).focus()
	expect( await page.evaluate( () => document.activeElement.title ) ).toBe( "Close side" )
} )

test( "a page may leave out the menu and more", async ( { page } ) => {
	await page.evaluate( () => {
		document.getElementById( "menu" ).remove()
		document.getElementById( "more" ).remove()
		document.getElementById( "shell" ).className = "show-main-side"
	} )
	await settle( page )
	const shown = await columns( page )
	expect( shown.main ).toEqual( { left: 1, width: 863 } )
	expect( shown.side ).toEqual( { left: 864, width: 863 } )
} )

test( "a layout slides into the next instead of jumping", async ( { page } ) => {
	const layouts = Object.keys( WIDTHS )
	for( const [ from, to ] of layouts.flatMap( from => layouts.filter( to => to !== from ).map( to => [ from, to ] ) ) ) {
		const sliding = await page.evaluate( ( [ from, to ] ) => {
			const shell = document.getElementById( "shell" )
			shell.className = from
			shell.getAnimations().forEach( animation => animation.finish() )
			shell.getBoundingClientRect()
			shell.className = to
			return shell.getAnimations().map( animation => animation.transitionProperty )
		}, [ from, to ] )
		expect( sliding, `${ from } to ${ to }` ).toEqual( [ "grid-template-columns" ] )
	}
} )

// ---- The look ------------------------------------------------------------------------------------

// The computed colour of a property, as [ red, green, blue ] from 0 to 255. A mixed colour computes as color(srgb r g b), from 0 to 1.
async function colour( page, selector, property ) {
	const value = await page.locator( selector ).first().evaluate( ( element, property ) => getComputedStyle( element )[ property ], property )
	const channels = value.match( /[\d.]+/g ).slice( 0, 3 ).map( Number )
	return value.startsWith( "color(srgb" ) ? channels.map( channel => Math.round( channel * 255 ) ) : channels
}

// Carbon's g100 theme in dark, and its g10 theme in light.
const CARBON = {
	dark: { background: [ 22, 22, 22 ], text: [ 244, 244, 244 ], quiet: [ 198, 198, 198 ] },
	light: { background: [ 244, 244, 244 ], text: [ 22, 22, 22 ], quiet: [ 82, 82, 82 ] },
}

for( const [ scheme, carbon ] of Object.entries( CARBON ) ) {
	test( `in ${ scheme }, the colours are Carbon's`, async ( { page } ) => {
		await page.emulateMedia( { colorScheme: scheme } )
		expect( await colour( page, "#shell", "backgroundColor" ), "background" ).toEqual( carbon.background )
		expect( await colour( page, "#main .title", "color" ), "text" ).toEqual( carbon.text )
		expect( await colour( page, "#main .neck", "color" ), "quiet text" ).toEqual( carbon.quiet )
		expect( await colour( page, "#main .icon-button", "color" ), "icon at rest" ).toEqual( carbon.quiet )
	} )

	test( `in ${ scheme }, the menu is a shade from main and the borders are faint`, async ( { page } ) => {
		await page.emulateMedia( { colorScheme: scheme } )
		const background = await colour( page, "#shell", "backgroundColor" )
		const apart = ( one, other ) => Math.max( ...one.map( ( value, index ) => Math.abs( value - other[ index ] ) ) )
		const menu = apart( await colour( page, "#menu", "backgroundColor" ), background )
		expect( menu ).toBeGreaterThanOrEqual( 1 )
		expect( menu ).toBeLessThanOrEqual( 3 )
		for( const [ selector, property ] of [ [ "#shell", "borderTopColor" ], [ "#menu", "borderRightColor" ], [ "#main .head", "borderBottomColor" ] ] ) {
			const border = apart( await colour( page, selector, property ), background )
			expect( border, `${ selector } ${ property }` ).toBeGreaterThanOrEqual( 5 )
			expect( border, `${ selector } ${ property }` ).toBeLessThanOrEqual( 10 )
		}
	} )
}

test( "Carbon's own tokens win where the page has them", async ( { page } ) => {
	await page.evaluate( () => document.documentElement.style.setProperty( "--cds-background", "rgb(1, 2, 3)" ) )
	expect( await colour( page, "#shell", "backgroundColor" ) ).toEqual( [ 1, 2, 3 ] )
} )

test( "the shell has a border of its own around its columns", async ( { page } ) => {
	const widths = await page.locator( "#shell" ).evaluate( shell => {
		const style = getComputedStyle( shell )
		return [ style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth ]
	} )
	expect( widths ).toEqual( [ "1px", "1px", "1px", "1px" ] )
} )

test( "an icon button is one base space square, with a 16px icon that lights up under the pointer", async ( { page } ) => {
	await page.emulateMedia( { colorScheme: "dark" } )
	const button = page.locator( "#main .head .icon-button" ).first()
	expect( await button.boundingBox() ).toMatchObject( { width: 40, height: 40 } )
	expect( await button.locator( "svg" ).boundingBox() ).toMatchObject( { width: 16, height: 16 } )
	await button.hover()
	await expect.poll( () => colour( page, "#main .head .icon-button", "color" ) ).toEqual( CARBON.dark.text )
	expect( await button.evaluate( button => getComputedStyle( button ).backgroundColor ) ).toBe( "rgba(141, 141, 141, 0.16)" )
} )

test( "the logo cell holds an icon, and the type is Berkeley Mono Variable, then IBM Plex Mono", async ( { page } ) => {
	expect( await page.locator( "#menu .head .logo svg" ).count() ).toBe( 1 )
	const family = await page.locator( "#shell" ).evaluate( shell => getComputedStyle( shell ).fontFamily )
	expect( family ).toMatch( /^"Berkeley Mono Variable", "IBM Plex Mono"/ )
} )

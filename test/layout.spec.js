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

// At 1728px wide: menu 240px; side alone takes half of what is left, up to 864px; side and more take 33% each.
const WIDTHS = {
	"show-main": { menu: 0, main: 1728, side: 0, more: 0 },
	"show-menu-main": { menu: 240, main: 1488, side: 0, more: 0 },
	"show-main-side": { menu: 0, main: 864, side: 864, more: 0 },
	"show-menu-main-side": { menu: 240, main: 744, side: 744, more: 0 },
	"show-main-side-more": { menu: 0, main: 1728 - 2 * 570.24, side: 570.24, more: 570.24 },
	"show-menu-main-side-more": { menu: 240, main: 1728 - 240 - 2 * 570.24, side: 570.24, more: 570.24 },
}

for( const [ layout, widths ] of Object.entries( WIDTHS ) ) {
	test( `${ layout } shows its columns side by side at their widths`, async ( { page } ) => {
		await page.evaluate( layout => document.getElementById( "shell" ).className = layout, layout )
		await settle( page )
		const shown = await columns( page )
		let left = 0
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
	expect( foot.y + foot.height ).toBeCloseTo( 1117, 0 )
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
		const boxes = {
			"head title": await page.locator( `#${ id } .head > :nth-child(2)` ).boundingBox(),
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
	expect( await page.locator( "#main" ).boundingBox() ).toEqual( { x: 0, y: 0, width: 1728, height: 1117 } )
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
	expect( shown.main ).toEqual( { left: 0, width: 864 } )
	expect( shown.side ).toEqual( { left: 864, width: 864 } )
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

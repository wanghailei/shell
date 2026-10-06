import { test } from "node:test"
import assert from "node:assert/strict"
import * as shell from "../shell.js"

// A stand-in for the #shell element: a class list that behaves as the browser's does for the calls shell.js makes.
function element( ...names ) {
	return {
		get className() { return names.join( " " ) },
		classList: {
			contains: name => names.includes( name ),
			replace: ( from, to ) => {
				const index = names.indexOf( from )
				if( index === -1 ) return false
				if( names.includes( to ) && to !== from ) names.splice( index, 1 )
				else names[ index ] = to
				return true
			},
		},
	}
}

// Where each change lands from each layout. This is Nexus's shell_controller.js at b7e9f10, where Shell came from.
const CHANGES = {
	toggleMenu: {
		"show-main": "show-menu-main",
		"show-menu-main": "show-main",
		"show-main-side": "show-menu-main-side",
		"show-menu-main-side": "show-main-side",
		"show-main-side-more": "show-menu-main-side-more",
		"show-menu-main-side-more": "show-main-side-more",
	},
	showSide: {
		"show-main": "show-main-side",
		"show-menu-main": "show-menu-main-side",
		"show-main-side": "show-main-side",
		"show-menu-main-side": "show-menu-main-side",
		"show-main-side-more": "show-main-side",
		"show-menu-main-side-more": "show-menu-main-side",
	},
	hideSide: {
		"show-main": "show-main",
		"show-menu-main": "show-menu-main",
		"show-main-side": "show-main",
		"show-menu-main-side": "show-menu-main",
		"show-main-side-more": "show-main",
		"show-menu-main-side-more": "show-menu-main",
	},
	showMore: {
		"show-main": "show-main-side-more",
		"show-menu-main": "show-menu-main-side-more",
		"show-main-side": "show-main-side-more",
		"show-menu-main-side": "show-menu-main-side-more",
		"show-main-side-more": "show-main-side-more",
		"show-menu-main-side-more": "show-menu-main-side-more",
	},
	hideMore: {
		"show-main": "show-main",
		"show-menu-main": "show-menu-main",
		"show-main-side": "show-main-side",
		"show-menu-main-side": "show-menu-main-side",
		"show-main-side-more": "show-main-side",
		"show-menu-main-side-more": "show-menu-main-side",
	},
}

test( "shell.js exports exactly the five changes", () => {
	assert.deepEqual( Object.keys( shell ).sort(), Object.keys( CHANGES ).sort() )
} )

for( const [ change, landings ] of Object.entries( CHANGES ) ) {
	for( const [ from, to ] of Object.entries( landings ) ) {
		test( `${ change } turns ${ from } into ${ to }`, () => {
			const shellElement = element( from )
			shell[ change ]( shellElement )
			assert.equal( shellElement.className, to )
		} )
	}
}

test( "a change keeps the element's other classes where they are", () => {
	const shellElement = element( "wide", "show-menu-main", "dark" )
	shell.showSide( shellElement )
	assert.equal( shellElement.className, "wide show-menu-main-side dark" )
} )

test( "a change on an element with no layout class says which classes it needs", () => {
	const shellElement = element( "wide" )
	assert.throws( () => shell.showSide( shellElement ), {
		message: "#shell has no layout class (it has \"wide\"); give it one of: show-main, show-menu-main, show-main-side, show-menu-main-side, show-main-side-more, show-menu-main-side-more",
	} )
	assert.equal( shellElement.className, "wide" )
} )

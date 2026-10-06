// Shell 0.1.0 · github.com/wanghailei/shell
//
// The five ways Shell's layout changes. Each takes the #shell element and swaps its layout class for the next one;
// shell.css does the rest. Any other classes on #shell are left where they are.
//
//   import * as shell from "shell"
//   shell.showSide( document.getElementById( "shell" ) )

// The six layouts, named by the columns they show. Side always shows with more, so there is no "show-main-more".
const LAYOUTS = [ "show-main", "show-menu-main", "show-main-side", "show-menu-main-side", "show-main-side-more", "show-menu-main-side-more" ]

// Shows the menu if it is hidden, hides it if it shows; side and more stay as they are.
export function toggleMenu( shell ) {
	change( shell, columns => ( { ...columns, menu: !columns.menu } ) )
}

// Shows side, and closes more: a new side record makes the more beside it stale.
export function showSide( shell ) {
	change( shell, columns => ( { ...columns, side: true, more: false } ) )
}

// Hides side, and more with it.
export function hideSide( shell ) {
	change( shell, columns => ( { ...columns, side: false, more: false } ) )
}

// Shows more, opening side with it.
export function showMore( shell ) {
	change( shell, columns => ( { ...columns, side: true, more: true } ) )
}

// Hides more and keeps side.
export function hideMore( shell ) {
	change( shell, columns => ( { ...columns, more: false } ) )
}

function change( shell, next ) {
	const layout = layoutOf( shell )
	shell.classList.replace( layout, layoutShowing( next( columnsShownBy( layout ) ) ) )
}

function layoutOf( shell ) {
	const layout = LAYOUTS.find( name => shell.classList.contains( name ) )
	if( !layout ) throw new Error( `#shell has no layout class (it has "${ shell.className }"); give it one of: ${ LAYOUTS.join( ", " ) }` )
	return layout
}

// "show-menu-main-side" → { menu: true, side: true, more: false }
function columnsShownBy( layout ) {
	const columns = layout.split( "-" )
	return { menu: columns.includes( "menu" ), side: columns.includes( "side" ), more: columns.includes( "more" ) }
}

// { menu: true, side: true, more: false } → "show-menu-main-side"
function layoutShowing( { menu, side, more } ) {
	return [ "show", menu && "menu", "main", side && "side", more && "more" ].filter( Boolean ).join( "-" )
}

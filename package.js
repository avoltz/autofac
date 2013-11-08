// FIXME: search for fixmes.

function populateSubs(menu) {
/* test data */
	menu.subs = [
		new Menu(menu,"nothinghere",new Array(0)),
		new Menu(menu,"development", new Array(2)),
		new Menu(menu,"crap",new Array(1)),
	];
	menu.subs[1].subs = [
		new Menu(menu.subs[1],"gcc",new Array(0)),
		new Menu(menu.subs[1],"gdb",new Array(0)),
	];

	menu.subs[2].subs = [
		new Menu(menu.subs[2],"foo",new Array(0)),
	];
}

var pkgContInst = null;

function PackageContainer(element) {
	pkgContInst = this;
	// create a global package hash
	this.packageHash = new Array(0);
	// top-level array of menusc
	this.topMenu = new Menu(null,"Categories",new Array(0));
	
	populateSubs(this.topMenu);

	// create current menu
	this.active = document.createElement("menu1");
	this.active.className = "menu";
	this.backbuffer = document.createElement("menu2");
	this.backbuffer.className = "menu";

	var container = document.getElementById(element);
	container.appendChild(this.active);
	container.appendChild(this.backbuffer);

	this.active.appendChild(this.topMenu.getView());
}

PackageContainer.prototype.showNext = function(next) {
	if (next == null || next.subs.length == 0) return;
	var old = this.active;
	this.active = this.backbuffer;
	this.active.style.display = "block";

	//clean em up up up.
	while(old.childNodes.length)
		old.removeChild(old.childNodes[0]);
	this.backbuffer = old;
	this.backbuffer.style.display = "none";

	this.active.appendChild(next.getView());
}

/* A package, with details */
function Package(menu) {
	// where is this package in menu
	this.parentMenu = menu;
	// ui package details
	this.license = "";
	this.version = "";
	this.help = "";
	// what packages/names does this select?
	this.selects = new Array(0);
	// token should be passed to factory 'TSWO_SOFTWARE_foo=y'
	this.token = "";
	// these tokens indicate if it is user selected or required
	// by another package
	this.user_selected = false;
	// if nonzero, this is included in build, by a selected package
	// FIXME: Maybe this should be a hash as well? so it would be easily shown who is selecting...
	this.required = 0;
}

Package.prototype.isSelected = function() {
	return (required > 0 || user_selected);
}

/* A menu item. */
function Menu(parent,name,subs) {
	this.parentMenu = parent;
	this.label = (name == null ? "" : name);
	// children will be either menus, or packages
	this.subs = subs;
}

// where in the menu tree are we, show the user calculate here, recursive search thru parents
Menu.prototype.whereami = function () {
	while (this.parentMenu != null) {
		return (this.parentMenu.whereami() + " / " + this.label);
	}
	return this.label;
};

// return a DOM element showing a menu label
Menu.prototype.getMenuLink = function(style) {
	var lbldiv = document.createElement("div");
	var lbl = document.createElement("a");
	lbl.appendChild(document.createTextNode(this.label));
	var me = this;
	lbl.onclick = function () { pkgContInst.showNext(me); };
	lbl.className=style;
	lbldiv.appendChild(lbl);
	return lbldiv;
}

/* Each menu has a label, a parent (or null if top-level),
   and several submenus or children.
   We get the label from each child for showing. */
Menu.prototype.getView = function() {
	//show path back
	var view;
	if (this.parentMenu == null) {
		view = document.createElement("div");
	} else { 
		view = this.parentMenu.getMenuLink("parent-menu");
	}
	var div = document.createElement("div");
	div.className = "menu-location";
	// then location
	var whereami = this.whereami();
	view.appendChild(div);
	
	view.appendChild(document.createTextNode(whereami));
	// finally children
	div = document.createElement("div");
	div.className = "menu";
	view.appendChild(div);
	for (var i = 0; i < this.subs.length; i++) {
		view.appendChild(this.subs[i].getMenuLink("menu"));
	}
	return view;
}


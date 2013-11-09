// FIXME: search for fixmes.

function onClickShowNext(e) {
	pkgContInst.showNext(this.factoryItem);
}

var pkgContInst = null;

function PackageContainer(searchDiv,pkgDiv,menus) {
	pkgContInst = this;
	// top-level array of menus
	this.topMenu = menus;

	// create current menu
	this.active = document.createElement("div");
	this.active.className = "menu";
	this.backbuffer = document.createElement("div");
	this.backbuffer.className = "menu";

	// populate the search container with our widgets
	var container = document.getElementById(searchDiv);
	container.appendChild(document.createElement("div"));
	this.searchText = document.createElement("input");
	this.searchText.type = "text";
	container.appendChild(this.searchText);
	var div = document.createElement("button");
	div.appendChild(document.createTextNode("Search"));
	container.appendChild(div);
	this.searchResult = document.createElement("div");
	container.appendChild(this.searchResult);
	
	container = document.getElementById(pkgDiv);
	// then the package container with nav divs
	container.appendChild(this.active);
	container.appendChild(this.backbuffer);

	this.showNext(this.topMenu);
}

PackageContainer.prototype.showNext = function(next) {
	if (next == null || (next instanceof Menu && next.subs.length == 0)) return;
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
function Package(name,lic,ver,help,token) {
	// ui package details
	this.name = name;
	this.license = lic;
	this.version = ver;
	this.help = help;
	// what packages/names does this select?
	this.selects = new Array(0);
	// token should be passed to factory 'TSWO_SOFTWARE_foo=y'
	this.token = token;
	// these tokens indicate if it is user selected or required
	// by another package
	this.user_selected = false;
	// which selected package requires this
	this.required_by = new Array(0);
	Package.packageHash[this.token] = this; // reflexive reference
}
Package.prototype.toString = function() { return "Pkg:" + this.token; }
Package.packageHash = new Object();

Package.prototype.isSelected = function() {
	return (required > 0 || user_selected);
}

Package.prototype.getMenuLink = function(style) {
	var lbldiv = document.createElement("div");
	//FIXME: Add selection checkbox, using isSelected
	var lbl = document.createElement("a");
	lbl.appendChild(document.createTextNode(this.name));
	lbl.factoryItem = this;
	lbl.onclick = onClickShowNext;
	lbl.className=style;
	lbldiv.appendChild(lbl);
	return lbldiv;
}

Package.prototype.getView = function() {
	var view = document.createElement("div");
	view.appendChild(this.parentMenu.getMenuLink("parent-menu"));
	// wrap all package details in one div --probably pointless for now.
	var div = document.createElement("div");
	div.className = "package";
	view.appendChild(div);
	var div = document.createElement("div");
	div.appendChild(document.createTextNode(this.name));
	view.appendChild(div);
	var div = document.createElement("div");
	div.appendChild(document.createTextNode(this.version));
	view.appendChild(div);
	var div = document.createElement("div");
	div.appendChild(document.createTextNode(this.license));
	view.appendChild(div);
	var div = document.createElement("div");
	div.appendChild(document.createTextNode(this.help));
	view.appendChild(div);
	return view;
}

/* A menu item. */
function Menu(name,subs) {
	this.label = (name == null ? "" : name);
	// children will be either menus, or packages
	this.subs = subs;
	this.parentMenu = null;
	for(var i = 0; i < this.subs.length; i++)
		this.subs[i].parentMenu = this;
}
Menu.prototype.toString = function() { return "Menu:" + this.label; }

// where in the menu tree are we, show the user calculate here, recursive search thru parents
Menu.prototype.whereami = function () {
	if (this.parentMenu != null) {
		return (this.parentMenu.whereami() + " / " + this.label);
	}
	return this.label;
};

// return a DOM element showing a menu label
Menu.prototype.getMenuLink = function(style) {
	var lbldiv = document.createElement("div");
	var lbl = document.createElement("a");
	lbl.appendChild(document.createTextNode(this.label));
	lbl.factoryItem = this;
	lbl.onclick = onClickShowNext;
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


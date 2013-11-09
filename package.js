// FIXME: search for fixmes.

function onClickShowNext(e) {
	pkgContInst.showNext(this.factoryItem);
}

function createEmptyElement(element, clas) {
	var node = document.createElement(element);
	if(clas) node.className = clas;
	return node;
}
function createElement(element, clas, contents) {
	// For aesthetic reasons, the second argument is the optional one
	if(arguments.length == 2) {
		contents = clas;
		clas = '';
	}
	var node = createEmptyElement(element, clas);
	if(contents) {
		if(typeof contents == "string")
			node.appendChild(document.createTextNode(contents));
		else
			node.appendChild(contents);
	}
	return node;
}

var pkgContInst = null;

function PackageContainer(containerDiv, menus) {
	if(arguments.length == 0) return;
	pkgContInst = this;
	// top-level array of menus
	this.topMenu = menus;

	// create current menu
	this.active = document.createElement("div");
	this.active.className = "menu";
	this.backbuffer = document.createElement("div");
	this.backbuffer.className = "menu";

	// populate the search container with our widgets
	var searchDiv = document.createElement("div");
	searchDiv.appendChild(document.createElement("div"));
	this.searchText = document.createElement("input");
	this.searchText.type = "text";
	searchDiv.appendChild(this.searchText);
	var div = document.createElement("button");
	div.appendChild(document.createTextNode("Search"));
	searchDiv.appendChild(div);
	this.searchResult = document.createElement("div");
	searchDiv.appendChild(this.searchResult);
	
	this.container = document.createElement("div");
	this.container.className = "menucontainer";
	// then the package container with nav divs
	this.container.appendChild(this.active);
	this.container.appendChild(this.backbuffer);
	this.containerHeight = 0;

	if (typeof containerDiv == "string")
		containerDiv = document.getElementById(containerDiv);
	containerDiv.appendChild(searchDiv);
	containerDiv.appendChild(this.container);

	this.showNext(this.topMenu);
}

PackageContainer.prototype.showNext = function(next) {
	if (next == null || (next instanceof Menu && next.subs.length == 0)) return;
	// Populate the backbuffer.
	this.backbuffer.appendChild(next.getView());

	// Flip "buffer" references.
	var old = this.active;
	this.active = this.backbuffer;
	this.backbuffer = old;

	// Change display so that the two won't be visible at the same time.
	this.backbuffer.style.display = "none";
	this.active.style.display = "block";

	// Only decrease the height when significant to reduce lower-page jitter
	var menuHeight = this.active.clientHeight;
	if (menuHeight > this.containerHeight
	||  menuHeight < this.containerHeight - 100) {
		this.container.style.height = menuHeight + "px";
		this.containerHeight = menuHeight;
	}

	// Dispose of unwanted content now that it can't be seen.
	while(old.childNodes.length)
		old.removeChild(old.childNodes[0]);

}

function MenuConfig(mcDiv, file, title, helptxt, menus) {
	if (typeof mcDiv == "string")
		mcDiv = document.getElementById(mcDiv);

	mcDiv.appendChild(createElement("div", "cfg_header",
					file + ' - ' + title));
	mcDiv.appendChild(createEmptyElement("hr"));

	var internal = createElement("div", "cfg_internal", helptxt);
	var menuDiv = createEmptyElement("div", "cfg_menu");
	internal.appendChild(menuDiv);

	var fg = createElement("div", "cfg_foreground",
			createElement("div", "cfg_internal_header",
				createElement("span", title)));
	fg.appendChild(internal);
	//TODO: Make these actual buttons that do something
	var control = createElement("div", "cfg_control",
				    "<Select> <Exit> <Help>");
	fg.appendChild(control);
	mcDiv.appendChild(fg);

	PackageContainer.call(this, menuDiv, menus);
}
MenuConfig.prototype = new PackageContainer();
MenuConfig.prototype.constructor = MenuConfig;

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
	lbl.href = "javascript:void(0)";
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
	lbl.href = "javascript:void(0)";
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


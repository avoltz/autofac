// FIXME: search for fixmes.

function onClickShowNext(e) {
	pkgContInst.showNext(this.factoryItem);
}

function onClickSearch(e) {
	var str = pkgContInst.searchText.value.toLowerCase();
	// Purge old results
	pkgContInst.searchResult.style.display = "none";
	removeChildren(pkgContInst.searchResult);
	// try a whole name match and go to it
	var pkg = Package.packageHash[str];
	var exactMatch = (pkg) ? true : false;
	// build a result list
	var pkgNames = Object.keys(Package.packageHash);
	var pkgMatches = [];
	for (var k = 0; k < pkgNames.length; k++) {
		pkg = Package.packageHash[pkgNames[k]];
		if (pkg.name.match(str)) pkgMatches.push(pkg);
	}
	if (pkgMatches.length == 1 && exactMatch) {
		pkgContInst.showNext(pkgMatches[0]);
	} else {
		while (pkgMatches.length) {
			pkgContInst.searchResult.appendChild(
				pkgMatches.shift().getMenuLink("search-result"));
		}
	}
	pkgContInst.searchResult.style.display = "block";
}

function onChangePackageSelection(e) {
	this.factoryItem.updateSelection(this.checked, Package.USER_SELECTED);
}

function createElement(element, clas) {
	var node = document.createElement(element);
	if(clas) node.className = clas;
	return node;
}
function createElements(element, clas, contents) {
	// For aesthetic reasons, the second argument is the optional one
	if(arguments.length == 2) {
		contents = clas;
		clas = '';
	}
	var node = createElement(element, clas);
	createElementsAppend(node, contents);
	return node;
}
function createElementsAppend(node, contents) {
	switch (typeof contents) {
	case "string":
		node.appendChild(document.createTextNode(contents));
		break;
	case undefined:
		// Prevent catch-all if no items were provided.
		break;
	default:
		if (contents instanceof Array) {
			for(var i=0; i<contents.length; i++)
				createElementsAppend(node, contents[i]);
		} else {
			node.appendChild(contents);
		}
	}
}
function removeChildren(element) {
	while(element.childNodes.length)
		element.removeChild(element.childNodes[0]);
}

var pkgContInst = null;

function PackageContainer(containerDiv, menus) {
	if(arguments.length == 0) return;
	pkgContInst = this;
	Package.finalizeHash();
	// top-level array of menus
	this.topMenu = menus;

	// create current menu
	this.active = createElement("div", "menu");
	this.backbuffer = createElement("div", "menu");

	// populate the search container with our widgets
	this.searchText = createElement("input");
	this.searchText.type = "text";
	this.searchResult = createElement("div");
	var searchButton = createElements("button","Search");
	searchButton.onclick = onClickSearch;
	var searchDiv = createElements("div", "search", [
		//createElement("div"), // XXX Why is an unreferenced DIV here?
		this.searchText,
		searchButton,
		this.searchResult ]);
	
	// then the package container with nav divs
	this.container = createElements("div", "menucontainer",
					[this.active, this.backbuffer]);
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

	removeChildren(old);
}

function MenuConfig(mcDiv, file, title, helptxt, menus) {
	if (typeof mcDiv == "string")
		mcDiv = document.getElementById(mcDiv);

	mcDiv.appendChild(createElements("div", "cfg_header",
					file + ' - ' + title));
	mcDiv.appendChild(createElement("hr"));

	var menuDiv = createElement("div", "cfg_menu");
	//TODO: Make these actual buttons that do something
	var control = createElements("div", "cfg_control",
				    "<Select> <Exit> <Help>");

	var fg = createElements("div", "cfg_foreground", [
			createElements("div", "cfg_internal_header",
				createElements("span", title)),
			createElements("div", "cfg_internal",
				[ helptxt, menuDiv ]),
			control]);
	mcDiv.appendChild(fg);

	PackageContainer.call(this, menuDiv, menus);
}
MenuConfig.prototype = new PackageContainer();
MenuConfig.prototype.constructor = MenuConfig;

/* A package, with details */
function Package(name,lic,ver,help,token,state,depends) {
	// ui package details
	this.name = name;
	this.license = lic;
	this.version = ver;
	this.help = help;
	// what packages/names does this select?
	this.selects = depends;
	// token should be passed to factory 'TSWO_SOFTWARE_foo=y'
	this.token = token;
	// these tokens indicate if it is user selected or required
	// by another package
	this.state = state;
	// which selected package requires this
	this.required_by = new Array(0);
	Package.packageHash[this.name.toLowerCase()] = this; // reflexive reference
}
Package.prototype.toString = function() { return "Pkg:" + this.token; }
Package.packageHash = new Object();
Package.USER_SELECTED = 1;
Package.AUTO_SELECTED = 2;

Package.finalizeHash = function() {
	// Call this once when the hash is entirely populated.

	for (var pn in Package.packageHash) {
		var pkg = Package.packageHash[pn];
		for (var i=0; i<pkg.selects.length; i++) {
			var dependency = Package.packageHash[
						pkg.selects[i].toLowerCase()];
			dependency.required_by.push(pkg);
			if (pkg.state)
				dependency.state |= Package.AUTO_SELECTED;
		}
	}
}

Package.prototype.getMenuLink = function(style) {
	//FIXME: Add selection checkbox, using isSelected
	var lbl = createElements("a", style, this.name);
	lbl.factoryItem = this;
	lbl.onclick = onClickShowNext;
	lbl.href = "javascript:void(0)";
	return createElements("div", [this.createCheckbox(), lbl]);
}

Package.prototype.createCheckbox = function() {
	var checkbox = createElement("input");
	checkbox.type = "checkbox";
	checkbox.factoryItem = this;
	checkbox.id = this.getCheckboxName();
	checkbox.onchange = onChangePackageSelection;
	this.setCheckboxState(checkbox);
	return checkbox;
}
Package.prototype.setCheckboxState = function(cb) {
	cb.checked = (this.state != 0);
	cb.disabled = (this.state & Package.AUTO_SELECTED);
}
Package.prototype.getCheckboxName = function() {
	return "checkbox_" + this.name;
}

Package.prototype.getCheckbox = function() {
	return document.getElementById(this.getCheckboxName());
}

Package.prototype.updateSelection = function(selected, mask) {
	var oldSelState = (this.state != 0);
	if (selected) {
		this.state |=  mask;
	} else { // de-select
		var dmask = mask;
		if (dmask & Package.AUTO_SELECTED) {
			// Only unflag if all requiring packages are unselected.
			for (var r=0; r<this.required_by.length; r++) {
				if (this.required_by[r].state) {
					dmask &= ~Package.AUTO_SELECTED;
					break;
				}
			}
		}
		this.state &= ~dmask;
	}

	/* Always try to update the checkbox since we assume something must
	 * have changed (selection state OR dependency state) */
	var cb = this.getCheckbox();
	if (cb) this.setCheckboxState(cb);

	var newSelState = (this.state != 0);
	if (oldSelState != newSelState) {
		// Update dependencies.
		for (var i=0; i<this.selects.length; i++) {
			Package.packageHash[this.selects[i].toLowerCase()]
				.updateSelection(newSelState,
						 Package.AUTO_SELECTED);
		}
	}
}

Package.prototype.getView = function() {
	var dependencies = createElement("div", "dependency-list");
	for (var i=0; i<this.selects.length; i++) {
		var pkg = Package.packageHash[this.selects[i].toLowerCase()];
		dependencies.appendChild(pkg.getMenuLink("dependency"));
	}
	if (dependencies.childNodes.length == 0)
		dependencies.appendChild(
			document.createTextNode("No Package Dependencies"));
	var view = createElements("div", [
				  this.parentMenu.getMenuLink("parent-menu"),
				  //createElement("div", "package"),
				  createElements("div", [this.createCheckbox(),
							 " " + this.name]),
				  createElements("div", this.version),
				  createElements("div", this.license),
				  createElements("div", this.help),
				  createElements("div", ["Dependencies:",
							 dependencies]),
				]);
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
	var lbldiv = createElement("div");
	var lbl = createElements("a", style, this.label);
	lbl.factoryItem = this;
	lbl.onclick = onClickShowNext;
	lbl.href = "javascript:void(0)";
	return createElements("div", lbl);
}

/* Each menu has a label, a parent (or null if top-level),
   and several submenus or children.
   We get the label from each child for showing. */
Menu.prototype.getView = function() {
	//show path back
	var view;
	if (this.parentMenu == null) {
		view = createElement("div");
	} else { 
		view = this.parentMenu.getMenuLink("parent-menu");
	}
	var div = createElements("div", "menu-location", this.whereami());
	// then location
	view.appendChild(div);
	
	// finally children
	div = createElement("div", "menu");
	view.appendChild(div);
	for (var i = 0; i < this.subs.length; i++) {
		view.appendChild(this.subs[i].getMenuLink("menu"));
	}
	return view;
}


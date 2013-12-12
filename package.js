// FIXME: search for fixmes.

function onClickShowNext(e) {
	pkgContInst.showNext(this.factoryItem);
}

function onClickSubmitWorkorder(e) {
	pkgContInst.submitWorkorder();
}

function onKeyDownSearch(e) {
	// Do checks for multi-browser support
	var evt = (e ? e : window.event);
	var key = evt.keyCode || evt.which;
	if (key == 13) // Enter
		onClickSearch(e);
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
	var pkgMatches = [];
	for (var k in Package.packageHash) {
		pkg = Package.packageHash[k];
		if (k.match(str)) pkgMatches.push(pkg);
	}
	if (pkgMatches.length == 1 && exactMatch) {
		pkgContInst.showNext(pkgMatches[0]);
	} else {
		pkgMatches.sort(caseInsensitiveSort);
		while (pkgMatches.length) {
			pkgContInst.searchResult.appendChild(
				pkgMatches.shift().getMenuLink("search-result"));
		}
	}
	pkgContInst.searchResult.style.display = "block";
}
function caseInsensitiveSort(a,b) {
	// Package names are unique, so only worry about < and > cases.
	return (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
}

function onChangePackageSelection(e) {
	this.factoryItem.updateSelection(this.checked, Package.USER_SELECTED);
	pkgContInst.updatePackageStats();
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
	// arrays for convenient lookup
	this.user_selected = [];
	this.dep_selected = [];
	this.installSize = 0;
	this.buildTime = 0;
	Package.finalizeHash();
	// top-level array of menus
	this.topMenu = menus;

	// create current menu
	this.active = createElement("div", "menu");
	this.backbuffer = createElement("div", "menu");

	// common statistic displays (associated with display element later)
	this.statUserSelPkgs = createElement("span");
	this.statAutoSelPkgs = createElement("span");
	this.statSelPkgsSize = createElement("span");
	this.statSelPkgsTime = createElement("span");

	// populate the search container with our widgets
	this.searchText = createElement("input");
	this.searchText.type = "text";
	this.searchText.onkeydown = onKeyDownSearch;
	this.searchResult = createElement("div", "search-result-list");
	var searchButton = createElements("button","Search");
	searchButton.onclick = onClickSearch;
	var searchDiv = createElements("div", "search", [
		createElements("div", "statistics", [
			createElements("div", [ "Selected Packages: ",
						this.statUserSelPkgs ]),
			createElements("div", [ "Package Dependencies: ",
						this.statAutoSelPkgs ]),
			createElements("div", [ "Estimated Install Size: ",
						this.statSelPkgsSize ]),
			createElements("div", [ "Estimated Build Time: ",
						this.statSelPkgsTime ]) ]),
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
	this.updatePackageStats();
}


PackageContainer.prototype.showNext = function(next) {
	if (next == null || (next instanceof Menu && next.subs.length == 0)) return;
	// Populate the backbuffer.
	this.backbuffer.appendChild(next.buildBreadcrumbs(
				createElement("div", "breadcrumbs"), " / "));
	this.backbuffer.appendChild(next.getView());
	this.setTitle(next);

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

PackageContainer.prototype.setTitle = function(current) {
	/* This should only ever be overridden based on a particular viewing
	 * style, likely with the use of whereami()
	 */
}

PackageContainer.prototype.updatePackageStats = function() {
	/* We don't want to call this after every statistic change; try to call
	 * it once when all changes from a single action (user [de/]selection)
	 * have been processed. */
	var actions = [	this.statUserSelPkgs,	this.user_selected.length,
			this.statAutoSelPkgs,	this.dep_selected.length,
			this.statSelPkgsSize,	this.installSize,
			this.statSelPkgsTime,	this.buildTime ];
	for (var i=0; i<actions.length; i+=2) {
		removeChildren(actions[i]);
		actions[i].appendChild(document.createTextNode(actions[i+1]));
	}
}

PackageContainer.prototype.submitWorkorder = function() {
	var form = createElement("form");
	//XXX Set form.action to submit this someplace
	form.method = "post";
	for (var k in Package.packageHash) {
		var pkg = Package.packageHash[k];
		var tkn = createElement("input");
		tkn.type = "hidden";
		tkn.name = pkg.token;
		tkn.value = (pkg.state & Package.USER_SELECTED) ? "y" : "n";
		form.appendChild(tkn);
	}
	// The form must be on-page in order to be submitted...
	this.backbuffer.appendChild(form);
	form.submit();
	// but we don't want it to stay around, so clean-up
	this.backbuffer.removeChild(form);
}

function MenuConfig(mcDiv, file, title, helptxt, menus) {
	if (typeof mcDiv == "string")
		mcDiv = document.getElementById(mcDiv);

	mcDiv.appendChild(createElements("div", "cfg_header",
					file + ' - ' + title));
	mcDiv.appendChild(createElement("hr"));

	this.exitButton = createElements("a", "<Exit>");
	this.exitButton.href = "javascript:void(0);";
	var menuDiv = createElement("div", "cfg_menu");
	//TODO: Make these actual buttons that do something
	var control = createElements("div", "cfg_control",
				     ["<Select> ",
				      this.exitButton,
				      " <Help>"]);

	this.titleElement = createElement("span");
	var fg = createElements("div", "cfg_foreground", [
			createElements("div", "cfg_internal_header",
				this.titleElement),
			createElements("div", "cfg_internal",
				[ helptxt, menuDiv ]),
			control]);
	mcDiv.appendChild(fg);

	PackageContainer.call(this, menuDiv, menus);
}
MenuConfig.prototype = new PackageContainer();
MenuConfig.prototype.constructor = MenuConfig;

MenuConfig.prototype.setTitle = function(current) {
	removeChildren(this.titleElement);
	this.titleElement.appendChild(document.createTextNode(current.name));
}

MenuConfig.prototype.showNext = function(next) {
	PackageContainer.prototype.showNext.apply(this, arguments);
	if (next.parentMenu) {
		this.exitButton.factoryItem = next.parentMenu;
		this.exitButton.onclick = onClickShowNext;
	} else {
		this.exitButton.onclick = onClickSubmitWorkorder;
	}
}

/* A package, with details */
function Package(name,lic,ver,help,token,state,depends,buildtime,installsize) {
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
	// This package contains one package -- itself!
	this.itemCount = 1;
	this.buildTime = buildtime;
	this.installSize = installsize;

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
				dependency.select(Package.AUTO_SELECTED);
		}
		if (pkg.state & Package.USER_SELECTED) {
			//THIS IS UGLY FIXME
			pkg.state = 0;
			pkg.select(Package.USER_SELECTED);
		}
	}
}

/* these functions manipulate the sorted arrays of selected packages,
   and dep selected packages, for use in UI */
Package.addPackageToList = function(arr,pkg) {
	// search for place to add, then add
	// position to add, if -1, array is empty
	var pos=0;
	while (pos < arr.length && pkg.name > arr[pos].name) {
		pos++;
	}
	arr.splice(pos,0,pkg);
}

Package.removePackageFromList = function(arr,pkg) {
	// search for place to remove ,then remove.
	var pos = arr.indexOf(pkg);
	arr.splice(pos,1);
}

Package.prototype.select = function(mask) {
	if (this.state & mask) return; // nothing to do
	if (mask & Package.USER_SELECTED) {
		Package.addPackageToList(pkgContInst.user_selected,this);
		if (this.state & Package.AUTO_SELECTED)
			Package.removePackageFromList(pkgContInst.dep_selected,
						      this);
	} else {
		if (!(this.state & Package.USER_SELECTED))
			Package.addPackageToList(pkgContInst.dep_selected,this);
	}
	if (!this.state) {
		pkgContInst.installSize += this.installSize;
		pkgContInst.buildTime += this.buildTime;
	}
	this.state |= mask;
}

Package.prototype.deselect = function(dmask) {
	if (!(this.state & dmask)) return; // nothing to do
	if (dmask & Package.USER_SELECTED) {
		Package.removePackageFromList(pkgContInst.user_selected,this);
		if (this.state & Package.AUTO_SELECTED)
			Package.addPackageToList(pkgContInst.dep_selected,this);
	} else {
		// Only unflag if all requiring packages are unselected.
		for (var r=0; r<this.required_by.length; r++) {
			if (this.required_by[r].state)
				return; // still a dep; nothing to do
		}
		Package.removePackageFromList(pkgContInst.dep_selected,this);
	}
	if (this.state) {
		pkgContInst.installSize -= this.installSize;
		pkgContInst.buildTime -= this.buildTime;
	}
	this.state &= ~dmask;
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
	checkbox.name = this.getCheckboxName();
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

Package.prototype.updateSelection = function(selected, mask) {
	var oldSelState = (this.state != 0);
	if (selected) {
		this.select(mask);
	} else { // de-select
		this.deselect(mask);
	}

	/* Always try to update the checkboxes since we assume something must
	 * have changed (selection state OR dependency state).
	 * Multiple checkboxes could appear for the same item due to search
	 * results and various viewing panes, so make sure we update them all.
	 */
	var cb = document.getElementsByName(this.getCheckboxName());
	for (var i=0; i<cb.length; i++)
		this.setCheckboxState(cb[i]);

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
				  //createElement("div", "package"),
				  createElements("div", [this.createCheckbox(),
							 " " + this.name]),
				  createElements("div", this.version),
				  createElements("div", this.license),
				  createElements("div", "package-help", this.help),
				  createElements("div", ["Dependencies:",
							 dependencies]),
				]);
	return view;
}

Package.prototype.buildBreadcrumbs = function(div, sep) {
	div.appendChild(createElements("span", this.name));
	if (this.parentMenu) {
		this.parentMenu.buildBreadcrumbs(div, sep);
	}
	return div;
}

/* A menu item. */
function Menu(name,subs) {
	this.name = (name == null ? "" : name);
	// children will be either menus, or packages
	this.subs = subs;
	this.parentMenu = null;
	this.itemCount = 0;
	for(var i = 0; i < this.subs.length; i++) {
		this.subs[i].parentMenu = this;
		this.itemCount += this.subs[i].itemCount;
	}
}
Menu.prototype.toString = function() { return "Menu:" + this.name; }

// where in the menu tree are we, show the user calculate here, recursive search thru parents
Menu.prototype.whereami = function () {
	var label = this.name + " (" + this.itemCount + ")"
	if (this.parentMenu != null) {
		return (this.parentMenu.whereami() + " / " + label);
	}
	return label;
};

// return a DOM element showing a menu label
Menu.prototype.getMenuLink = function(style) {
	var lbldiv = createElement("div");
	var lbl = createElements("a", style, this.name);
	lbl.factoryItem = this;
	lbl.onclick = onClickShowNext;
	lbl.href = "javascript:void(0)";
	return createElements("div", [lbl, " (" + this.itemCount + ")"]);
}

/* Each menu has a label, a parent (or null if top-level),
   and several submenus or children.
   We get the label from each child for showing. */
Menu.prototype.getView = function() {
	var view = createElement("div");
	for (var i = 0; i < this.subs.length; i++) {
		view.appendChild(this.subs[i].getMenuLink("menu"));
	}
	return view;
}

Menu.prototype.buildBreadcrumbs = function(div, sep) {
	if (div.hasChildNodes()) {
		div.insertBefore(document.createTextNode(sep), div.firstChild);
		div.insertBefore(this.getMenuLink("parent-menu"),
				 div.firstChild);
	} else {
		div.appendChild(createElements("span",
				this.name + " (" + this.itemCount + ")"));
	}
	if (this.parentMenu) {
		this.parentMenu.buildBreadcrumbs(div, sep);
	}
	return div;
}


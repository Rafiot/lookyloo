// From : https://bl.ocks.org/d3noob/43a860bc0024792f8803bba8ca0d5ecd

// Set the dimensions and margins of the diagram
var margin = {top: 20, right: 200, bottom: 30, left: 90},
    width = 9600 - margin.left - margin.right,
    height = 10000 - margin.top - margin.bottom;

var node_width = 0;
var max_overlay_width = 1500;
var default_max_overlay_height = 500;
var node_height = 55;
var t = d3.transition().duration(750);

var main_svg = d3.select("body").append("svg")
            .attr("width", width + margin.right + margin.left)
            .attr("height", height + margin.top + margin.bottom)

main_svg.append("clipPath")
    .attr("id", "textOverlay")
    .append("rect")
    .attr('width', max_overlay_width - 25)
    .attr('height', node_height);

main_svg.append("clipPath")
    .attr("id", "overlayHeight")
    .append("rect")
    .attr('width', max_overlay_width)
    .attr('height', default_max_overlay_height + 100);


// Add background pattern
var pattern = main_svg.append("defs").append('pattern')
    .attr('id', 'backstripes')
    .attr('x', margin.left)
    .attr("width", node_width * 2)
    .attr("height", 10)
    .attr('patternUnits', "userSpaceOnUse" )

pattern.append('rect')
    .attr('width', node_width)
    .attr('height', height)
    .attr("fill", "#EEEEEE");

var background = main_svg.append('rect')
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .style('fill', "url(#backstripes)");

// append the svg object to the body of the page
// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var node_container = main_svg
                        .append("g")
                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var i = 0,
    duration = 750,
    root;

// declares a tree layout and assigns the size
var treemap = d3.tree().size([width, height]);

// Assigns parent, children, height, depth
root = d3.hierarchy(treeData);
root.x0 = height / 2;  // middle of the page
root.y0 = 0;


// Fancy expand all the nodes one after the other
// Collapse after the second level
//root.children.forEach(collapse);

update(root);

// Collapse the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
};

// Gets the size of the box and increase it
function getBB(selection) {
    selection.each(function(d) {
        d.data.total_width = d.data.total_width ? d.data.total_width : 0;
        d.data.total_width += this.getBBox().width;
    })
};

function urlnode_click(d) {
    var url = "/tree/url/" + d.data.uuid;
    d3.blob(url, {credentials: 'same-origin'}).then(function(data) {
        saveAs(data, 'file.zip');
    });
};

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// What happen when clicking on a domain (load a modal display)
function hostnode_click(d) {
    // Move the node to the front (end of the list)
    var cur_node = d3.select("#node_" + d.data.uuid).moveToFront();
    // Avoid duplicating overlays
    cur_node.selectAll('.overlay').remove();
    // Insert new svg element at this position
    var overlay_hostname = cur_node.append('g')
                                .attr('class', 'overlay');

    cur_node.append('line')
                .attr('id', 'overlay_link')
                .style("opacity", "0.95")
                .attr("stroke-width", "2")
                .style("stroke", "gray");

    var top_margin = 15;
    var overlay_header_height = 50;
    var left_margin = 30;

    overlay_hostname
        .datum({x: 0, y: 0, overlay_uuid: d.data.uuid})
        .attr('id', 'overlay_' + d.data.uuid)
        .attr("transform", "translate(" + 10 + "," + 15 + ")")
        .call(d3.drag().on("drag", function(d, i) {
            if (typeof d.x === 'undefined') { d.x = 0; }  // Any real JS dev would kill me fo that, right?
            if (typeof d.y === 'undefined') { d.y = 0; }  // Maybe even twice.
            d.x += d3.event.dx
            d.y += d3.event.dy
            d3.select(this)
                .attr("transform", "translate(" + d.x + "," + d.y + ")");
            cur_node.select('#overlay_link')
                .attr("x2", d.x + left_margin + 10)
                .attr("y2", d.y + top_margin + 15);
        }));

    overlay_hostname.append('rect')
        .attr("rx", 6)
        .attr("ry", 6)
        .attr('x', 15)
        .attr('y', 10)
        .style("opacity", "0.95")
        .attr("stroke", "black")
        .attr('stroke-opacity', "0.8")
        .attr("stroke-width", "2")
        .attr("stroke-linecap", "round")
        .attr("fill", "white");

    // Modal display
    var url = "/tree/hostname/" + d.data.uuid;
    d3.json(url, {credentials: 'same-origin'}).then(function(urls) {
        overlay_hostname
            .append('circle')
            .attr('id', 'overlay_circle_' + d.data.uuid)
            .attr('height', overlay_header_height)
            .attr('cx', left_margin + 10)
            .attr('cy', top_margin + 15)
            .attr('r', 2);

        overlay_hostname
            .append('text')
            .attr('id', 'overlay_close_' + d.data.uuid)
            .attr('height', overlay_header_height)
            .attr('x', left_margin + 500)  // Value updated based on the size of the rectangle max: max_overlay_width
            .attr('y', top_margin + 25)
            .style("font-size", '30px')
            .text('\u2716')
            .attr('cursor', 'pointer')
            .on("click", function() {
                    main_svg.selectAll('#overlay_' + d.data.uuid).remove();
                    cur_node.select('#overlay_link').remove();
                }
            );

        overlay_hostname.append('line')
            .attr('id', 'overlay_separator_header' + d.data.uuid)
            .style("stroke", "black")
            .style('stroke-width', "1px")
            .attr('x1', 20)
            .attr('y1', overlay_header_height)
            .attr('x2', 500)
            .attr('y2', overlay_header_height);

        var url_entries = overlay_hostname.append('svg');

        var interval_entries = 40;
        urls.forEach(function(url, index, array) {
            var jdata = JSON.parse(url)
            url_entries.datum({'data': jdata});
            var text_node = text_entry(url_entries, left_margin, top_margin + overlay_header_height + (interval_entries * index), urlnode_click);
            var height_text = text_node.node().getBBox().height;
            icon_list(url_entries, left_margin + 5, top_margin + height_text + overlay_header_height + (interval_entries * index));
        });

        var overlay_bbox = overlay_hostname.node().getBBox()
        overlay_hostname.append('line')
            .attr('id', 'overlay_separator_footer' + d.data.uuid)
            .style("stroke", "black")
            .style('stroke-width', "1px")
            .attr('x1', 20)
            .attr('y1', overlay_bbox.height + 20)
            .attr('x2', 500)
            .attr('y2', overlay_bbox.height + 20);

        var overlay_bbox = overlay_hostname.node().getBBox()
        overlay_hostname
            .append('text')
            .attr('id', 'overlay_download_' + d.data.uuid)
            .attr('height', overlay_header_height - 10)
            .attr('x', left_margin)
            .attr('y', overlay_bbox.height + overlay_header_height)
            .style("font-size", '20px')
            .text('Download URLs as text')
            .attr('cursor', 'pointer')
            .on("click", function() {
                var url = "/tree/hostname/" + d.data.uuid + '/text';
                d3.blob(url, {credentials: 'same-origin'}).then(function(data) {
                    saveAs(data, 'file.md');
                });
            });

        var overlay_bbox = overlay_hostname.node().getBBox();
        overlay_hostname.select('rect')
            .attr('width', function() {
                optimal_size = overlay_bbox.width + left_margin
                return optimal_size < max_overlay_width ? optimal_size : max_overlay_width;
            })
            .attr('height', overlay_bbox.height + overlay_header_height);

        overlay_hostname.select('#overlay_close_' + d.data.uuid)
            .attr('x', overlay_hostname.select('rect').node().getBBox().width - 20);

        overlay_hostname.select('#overlay_separator_header' + d.data.uuid)
            .attr('x2', overlay_hostname.select('rect').node().getBBox().width + 10);
        overlay_hostname.select('#overlay_separator_footer' + d.data.uuid)
            .attr('x2', overlay_hostname.select('rect').node().getBBox().width + 10);


        cur_node.select('#overlay_link')
                    .attr("x1", 10)
                    .attr("y1", 0)
                    .attr("x2", left_margin + 3)
                    .attr("y2", top_margin + 7);
    });
};

function icon(key, icon_path, d){
    var content = d3.create("svg") // WARNING: svg is required there, "g" doesn't have getBBox
        .data(d);
    var icon_size = 16;

    content.filter(function(d){
            if (typeof d.data[key] === 'boolean') {
                return d.data[key];
            } else if (typeof d.data[key] === 'number') {
                return d.data[key] > 0;
            } else if (d.data[key] instanceof Array) {
                return d.data[key].length > 0;
            }
            return false;
        }).append('image')
            .attr("width", icon_size)
            .attr("height", icon_size)
            .attr('x', function(d) { return d.data.total_width ? d.data.total_width + 1 : 0 })
            .attr("xlink:href", icon_path).call(getBB);


    content.filter(function(d){
            if (typeof d.data[key] === 'boolean') {
                return false;
                // return d.data[key];
            } else if (typeof d.data[key] === 'number') {
                d.to_print = d.data[key]
                return d.data[key] > 0;
            } else if (d.data[key] instanceof Array) {
                d.to_print = d.data[key].length
                return d.data[key].length > 0;
            }
            return false;
        }).append('text')
          .attr("dy", 8)
          .style("font-size", "10px")
          .attr('x', function(d) { return d.data.total_width ? d.data.total_width + 1 : 0 })
          .attr('width', function(d) { return d.to_print.toString().length + 'em'; })
          .text(function(d) { return d.to_print; }).call(getBB);

    return content.node();
};

function icon_list(relative_x_pos, relative_y_pos, d) {
    // Put all the icone in one sub svg document
    var icons = d3.create("svg")  // WARNING: svg is required there, "g" doesn't have getBBox
          .data(d)
          .attr('x', relative_x_pos)
          .attr('y', relative_y_pos)
          .append(icon('js', "/static/javascript.png", d))
          .append(icon('exe', "/static/exe.png", d))
          .append(icon('css', "/static/css.png", d))
          .append(icon('font', "/static/font.png", d))
          .append(icon('html', "/static/html.png", d))
          .append(icon('json', "/static/json.png", d))
          .append(icon('iframe', "/static/ifr.png", d))
          .append(icon('image', "/static/img.png", d))
          .append(icon('unknown_mimetype', "/static/wtf.png", d))
          .append(icon('video', "/static/video.png", d))
          .append(icon('request_cookie', "/static/cookie_read.png", d))
          .append(icon('response_cookie', "/static/cookie_received.png", d))
          .append(icon('redirect', "/static/redirect.png", d))
          .append(icon('redirect_to_nothing', "/static/cookie_in_url.png", d));

    icons.filter(function(d){
        if (d.data.sane_js_details) {
            d.libinfo = d.data.sane_js_details[0];
            return d.data.sane_js_details;
        }
        return false;
    }).append('text')
      .attr('x', function(d) { return d.data.total_width ? d.data.total_width + 5 : 0 })
      .attr('y', 15)
      .style("font-size", "15px")
      .text(function(d) { return 'Library information: ' + d.libinfo }).call(getBB);

    return icons.node();
}

function text_entry(relative_x_pos, relative_y_pos, onclick_callback, d) {
    // Avoid hiding the content after the circle
    var nodeContent = d3.create("svg")  // WARNING: svg is required there, "g" doesn't have getBBox
          .attr('height', node_height)
          .attr('x', relative_x_pos)
          .attr('y', relative_y_pos);

    // Add labels for the nodes
    var text_nodes = nodeContent.append("text")
          .attr('dy', '.9em')
          .attr("stroke", "white")
          .style("font-size", "16px")
          .attr("stroke-width", ".2px")
          .style("opacity", .9)
          .attr('cursor', 'pointer')
          .attr("clip-path", "url(#textOverlay)")
          .text(d.data.name + ' (' + d.data.urls_count + ')')
          .on('click', onclick_callback);
    return nodeContent.node();
}


// Recursively generate the tree
function update(source, computed_node_width=0) {

  treemap = d3.tree().size([height, width]);

  // Assigns the x and y position for the nodes
  var treeData = treemap(root);
  // reinitialize max_depth
  var max_depth = treeData.descendants()[0].height

  if (computed_node_width != 0) {
    // Re-compute SVG size depending on the generated tree
    var newWidth = Math.max((max_depth + 2) * computed_node_width, node_width);
    // Update height
    // node_height is the height of a node, node_height * 10 is the minimum so the root node isn't behind the lookyloo icon
    var newHeight = Math.max(treemap(root).descendants().reverse().length * node_height, 10 * node_height);
    background.attr('height', newHeight + margin.top + margin.bottom)
    background.attr('width', newWidth + margin.right + margin.left)
    treemap.size([newHeight, newWidth])
    d3.select("body svg")
      .attr("width", newWidth + margin.right + margin.left)
      .attr("height", newHeight + margin.top + margin.bottom)

    // Assigns the x and y position for the nodes
    var treeData = treemap(root);
  }

  // Compute the new tree layout.
  var nodes = treeData.descendants(),
      links = treeData.descendants().slice(1);


  // ****************** Nodes section ***************************

  // Update the nodes...
  const tree_nodes = node_container.selectAll('g.node')
      .data(nodes, node => node.data.uuid);

  tree_nodes.join(
        // Enter any new modes at the parent's previous position.
        enter => {
            var node_group = enter.append('g');
            node_group
                .attr('class', 'node')
                .attr("id", d => 'node_' + d.data.uuid)
                .attr("transform", "translate(" + source.y0 + "," + source.x0 + ")")
                // Add Circle for the nodes
                .append('circle')
                .attr('class', 'node')
                .attr('r', 1e-6)
                .style("fill", d => d._children ? "lightsteelblue" : "#fff")
                .on('click', click);
            // Rectangle around the domain name & icons
            //.append('rect')
            //.attr("rx", 6)
            //.attr("ry", 6)
            //.attr('x', 13)
            //.attr('y', -23)
            //.style("opacity", "0.5")
            //.attr("stroke", "black")
            //.attr('stroke-opacity', "0.8")
            //.attr("stroke-width", "1.5")
            //.attr("stroke-linecap", "round")
            //.attr("fill", "white")
            // Set Hostname text
            node_group
                .append(d => text_entry(15, -20, hostnode_click, d));
            // Set list of icons
            // node_group
            //    .append(d => icon_list(17, 10, d));

            return node_group;
        },
        update =>  update,
        exit => exit
            // Remove any exiting nodes
            .call(exit => exit.transition(t)
               .attr("transform", "translate(" + source.y + "," + source.x + ")")
               .remove()
            )
            // On exit reduce the node circles size to 0
            .attr('r', 1e-6)
            // On exit reduce the opacity of text labels
            .style('fill-opacity', 1e-6)
    ).call(node => {
      // Transition to the proper position for the node
      node.attr("transform", node => "translate(" + node.y + "," + node.x + ")");
      // Update the node attributes and style
      node.select('circle.node')
        .attr('r', 10)
        .style("fill", node => node._children ? "lightsteelblue" : "#fff")
        .attr('cursor', 'pointer');
      node.selectAll('text').nodes().forEach(n => {
        // Set the width for all the nodes
        node_width = node_width > n.getBBox().width ? node_width : n.getBBox().width;
      });
    });

  nodes.forEach(d => {
    // Normalize for fixed-depth.
    d.y = d.depth * node_width
  });


  // Update pattern
  main_svg.selectAll('pattern')
    .attr('width', node_width * 2)
  pattern.selectAll('rect')
    .attr('width', node_width)

  if (computed_node_width === 0) {
    update(root, node_width)
  }

  // ****************** links section ***************************

  // Update the links...
  var link = node_container.selectAll('path.link')
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link")
      .attr('d', function(d){
        var o = {x: source.x0, y: source.y0}
        return diagonal(o, o)
      });

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate.transition()
      .duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  // Creates a curved (diagonal) path from parent to the child nodes
  function diagonal(s, d) {

    path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`

    return path
  }

  // Toggle children on click.
  function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    }
    else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
  }
}

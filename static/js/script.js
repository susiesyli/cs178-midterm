function draw_svg(container_id, margin, width, height, title){
    // Clear any existing SVG in the container
    d3.select("#"+container_id).html("");
    
    // Create the SVG element and append to container
    var svg = d3.select("#"+container_id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "white");
    
    // Add the title to the SVG
    svg.append("text")
        .attr("id", container_id + "-title")  // Add ID for dynamic updates
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .text(title);
    
    // Create and return the chart group with appropriate margin transform
    var chartGroup = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    return chartGroup;
}

function draw_xaxis(plot_name, svg, height, scale, ticks){
    svg.append("g")
        .attr('class', plot_name + "-xaxis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(scale)
            .tickValues(ticks)
            .tickFormat(d3.format(".1f")))
        .selectAll("text")
        .style("font-size", "10px");
}

function draw_yaxis(plot_name, svg, scale, ticks){
    svg.append("g")
        .attr('class', plot_name + "-yaxis")
        .call(d3.axisLeft(scale)
            .tickValues(ticks)
            .tickFormat(d3.format(".1f")))
        .selectAll("text")
        .style("font-size", "10px");
}

function draw_axis(plot_name, axis, svg, height, domain, range, ticks){
    var scale = d3.scaleLinear()
        .domain(domain)
        .range(range);
    
    if (axis=='x'){
        draw_xaxis(plot_name, svg, height, scale, ticks)
    } else if (axis=='y'){
        draw_yaxis(plot_name, svg, scale, ticks)
    }
    return scale
}

function draw_axes(plot_name, svg, width, height, domainx, domainy) {
    // Add padded tick marks to both axes domains
    const xTicks = generatePaddedTicks(domainx[0], domainx[1], 15);
    const yTicks = generatePaddedTicks(domainy[0], domainy[1], 15);

    var paddedDomainX = [xTicks[0], xTicks[xTicks.length - 1]]
    var paddedDomainY = [yTicks[0], yTicks[yTicks.length - 1]]
    
    // Add grid lines for better readability
    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(d3.scaleLinear().domain(paddedDomainX).range([0, width]))
            .tickSize(-height)
            .tickFormat("")
        );

    svg.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(d3.scaleLinear().domain(paddedDomainY).range([height, 0]))
            .tickSize(-width)
            .tickFormat("")
        );

    // Use the padded domains for the axes
    var x_scale = draw_axis(plot_name, 'x', svg, height, paddedDomainX, [0, width], xTicks);
    var y_scale = draw_axis(plot_name, 'y', svg, height, paddedDomainY, [height, 0], yTicks);
    
    return {'x': x_scale, 'y': y_scale};
}

function draw_slider(column, min, max, chart1_svg, chart2_svg, chart1_scale, chart2_scale){
    slider = document.getElementById(column+'-slider')
    
    // If slider already has noUiSlider, destroy it first
    if (slider.noUiSlider) {
        slider.noUiSlider.destroy();
    }
    
    // Determine step size based on column name
    let stepSize;
    let tooltipsConfig;
    
    if (column === 'SoftSkillsRating' || column === 'CGPA') {
        // Preserve decimal precision for slider 
        min = parseFloat(min).toFixed(1);  
        max = parseFloat(max).toFixed(1);
        // Use 0.1 step for SoftSkillsRating
        stepSize = 0.1;
        // Only show tooltip when slider is being used
        tooltipsConfig = true;
    } else {
        min = parseInt(min);
        max = parseInt(max);
        stepSize = 1;
        tooltipsConfig = true;
    }
    
    noUiSlider.create(slider, {
      start: [min, max],
      connect: true,
      tooltips: tooltipsConfig,
      step: stepSize,
    //   range: {'min': min, 'max': max}
      range: {'min': parseFloat(min), 'max': parseFloat(max)}
    });
    
    // Add min and max value labels with improved positioning
    const sliderContainer = document.getElementById(column+'-slider-container');
    
    // Clear existing slider container content first
    while (sliderContainer.firstChild) {
        sliderContainer.removeChild(sliderContainer.firstChild);
    }
    
    // Min label on the left
    const minLabel = document.createElement('div');
    minLabel.className = 'slider-label min-label';
    minLabel.textContent = min;
    sliderContainer.appendChild(minLabel);
    
    // Add the slider in the middle
    sliderContainer.appendChild(slider);
    
    // Max label on the right
    const maxLabel = document.createElement('div');
    maxLabel.className = 'slider-label max-label';
    maxLabel.textContent = max;
    sliderContainer.appendChild(maxLabel);
    
    slider.noUiSlider.on('change', function(){
        update(chart1_svg, chart2_svg, chart1_scale, chart2_scale)
    });
}

function draw_scatter(data, svg, scale, className, color){
    let dots = svg.selectAll("." + className)
        .data(data);
    
    // Remove old dots
    dots.exit().remove();

    // Get graph-selector value
    var graphSelector = document.getElementById('graph-selector').value;
    console.log(graphSelector);

    if (graphSelector == 4) {   // scatter plot with force layout
        // Add new dots
        dots = dots.enter()
            .append("circle")
            .attr("class", className)
            .merge(dots)
            .attr("cx", function(d) { return scale.x(d.x); })
            .attr("cy", function(d) { return scale.y(d.y); })
            .attr("r", 2.5)
            .style("fill", color)
            .style("opacity", 0.5);

        var simulation = d3.forceSimulation(data)
            .force('x', d3.forceX((d) => { return scale.x(d.x); }).strength(2))
            .force('y', d3.forceY((d) => { return scale.y(d.y); }).strength(2))
            .force('collide', d3.forceCollide(1))

        for (let i = 0; i < 10; i++) { simulation.tick(); }

        simulation.on('tick', function() {
            dots
                .attr('cx', (d) => d.x)
                .attr('cy', (d) => d.y);
        });

        simulation.on('end', function() {
            dots
                .style('stroke', 'black')
                .style('stroke-width', 0.5);
        });
    }
    else if (graphSelector == 2) {  // density plot
        // compute the density data
        var densityData = d3.contourDensity()
            .x(function(d) { return scale.x(d.x); })
            .y(function(d) { return scale.y(d.y); })
            .size([width, height])
            .bandwidth(10)
            (data);

        var colorScaler = d3.scaleLinear()
            .domain([0, 1]) // Points per square pixel.
            .range(["white", color]);

        svg
            .selectAll("path")
            .data(densityData)
            .enter()
            .append("path")
              .attr("d", d3.geoPath())
              .attr("fill", "none")
              .attr("stroke", "#69b3a2")
              .attr("stroke-linejoin", "round")
              .attr("class", className)
    }
    else if (graphSelector == 3) {  // contour plot
    // compute the density data
        var densityData = d3.contourDensity()
            .x(function(d) { return scale.x(d.x); })
            .y(function(d) { return scale.y(d.y); })
            .size([width, height])
            .bandwidth(1)
            (data);

        var colorScaler = d3.scaleLinear()
            .domain([0, 1]) // Points per square pixel.
            .range(["white", color]);

        // draw the contour
        svg.insert("g", "g")
            .selectAll("path")
            .data(densityData)
            .enter().append("path")
            .attr("d", d3.geoPath())
            .attr("fill", function(d) { console.log(colorScaler(d.value)); return colorScaler(d.value); });
    }
    else if (graphSelector == 1) {  // bubble plot
        // Create a map to count occurrences of each (x, y) pair
        const countMap = new Map();
        data.forEach(d => {
            const key = `${d.x},${d.y}`;
            if (countMap.has(key)) {
            countMap.set(key, countMap.get(key) + 1);
            } else {
            countMap.set(key, 1);
            }
        });

        // Convert the map back to an array of objects with x, y, and cnt
        const newData = Array.from(countMap, ([key, cnt]) => {
            const [x, y] = key.split(',').map(Number);
            return { x, y, cnt };
        });

        console.log(newData);

        svg.selectAll("." + className)
            .data(newData)
            .enter()
            .append("circle")
            .attr("class", className)
            .attr("cx", function(d) { return scale.x(d.x); })
            .attr("cy", function(d) { return scale.y(d.y); })
            .attr("r", function(d) { return Math.sqrt(d.cnt); })
            .style("fill", color)
            .style("opacity", 0.5);
    }
}

// Add a title and legend to a scatterplot with dynamic axis labels
function add_scatterplot_elements(svg, width, height, xAxisName, yAxisName) {
    // Add X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(xAxisName);
    
    // Add Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(yAxisName);
}

// Add a new function to draw the line of best fit
function draw_line_of_best_fit(svg, scale, lineData, className) {
    // If no line data or insufficient points, don't draw
    if (!lineData) return;

    // Calculate start and end points of the line based on the best fit parameters
    const x1 = lineData.min_x;
    const x2 = lineData.max_x;
    
    // Calculate corresponding y values using y = mx + b
    const y1 = lineData.slope * x1 + lineData.intercept;
    const y2 = lineData.slope * x2 + lineData.intercept;

    // Remove any existing line of best fit with this class name
    svg.selectAll("." + className).remove();

    // Draw the line
    svg.append("line")
        .attr("class", className)
        .attr("x1", scale.x(x1))
        .attr("y1", scale.y(y1))
        .attr("x2", scale.x(x2))
        .attr("y2", scale.y(y2))
        .style("stroke", "#000000")
        .style("stroke-width", 2)
        .style("opacity", 0.7);
}

// Modified function that extracts parameters including facet selection
function get_params(){
    // Extract parameters for all sliders
    const sliderParams = {};
    
    // Get all slider elements
    const sliderElements = document.querySelectorAll('[id$="-slider"]');
    
    // Extract values from each slider
    sliderElements.forEach(slider => {
        const columnName = slider.id.replace('-slider', '');
        sliderParams[columnName] = slider.noUiSlider.get().map(Number);
    });
    
    // Extract the selected extracurricular activities (True/False)
    const extracurricularCheckboxes = document.querySelectorAll('input.checkboxExtracurricular.extracurricular-selected');
    const extracurricularValues = Array.from(extracurricularCheckboxes).map(checkbox => checkbox.value);
    
    // Extract the selected placement training options (Yes/No)
    const placementTrainingCheckboxes = document.querySelectorAll('input.checkboxPlacementTraining.placement-training-selected');
    const placementTrainingValues = Array.from(placementTrainingCheckboxes).map(checkbox => checkbox.value);
    
    // Get current axis selections
    const xAxis = document.getElementById('x-axis-selector').value;
    const yAxis = document.getElementById('y-axis-selector').value;
    
    // Get current facet selection
    const facetColumn = document.getElementById('facet-selector').value;
    
    // Combine all parameters
    return {
        ...sliderParams,
        'ExtracurricularActivities': extracurricularValues,
        'PlacementTraining': placementTrainingValues,
        'x_axis': xAxis,
        'y_axis': yAxis,
        'facet_column': facetColumn
    };
}

function update_scatter(data, svg, scale, className, color){
    // Remove existing points
    svg.selectAll("." + className).remove();
    
    // Draw new points
    draw_scatter(data, svg, scale, className, color)
}

// Updated update function to handle faceted data and best fit lines
function update(chart1_svg, chart2_svg, chart1_scale, chart2_scale){
    params = get_params();
    fetch('/update', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(params),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())));
        
        // Get facet column and values
        const facetColumn = params.facet_column;
        let facetValues = [];
        
        // Determine facet values based on selected facet column
        if (facetColumn === 'PlacementStatus') {
            facetValues = ['Placed', 'NotPlaced'];
        } else if (facetColumn === 'PlacementTraining') {
            facetValues = ['Yes', 'No'];
        } else if (facetColumn === 'ExtracurricularActivities') {
            facetValues = ['Yes', 'No'];
        }
        
        // Update chart titles with facet information
        d3.select("#placed-scatter-title").text(`${facetColumn}: ${facetValues[0]}`);
        d3.select("#not-placed-scatter-title").text(`${facetColumn}: ${facetValues[1]}`);
        
        // Convert facet values to strings for accessing data
        const firstValue = String(facetValues[0]);
        const secondValue = String(facetValues[1]);
        
        // Update charts with faceted data
        update_scatter(
            results.data_groups[firstValue] || [], 
            chart1_svg, 
            chart1_scale, 
            "chart1-point", 
            "#4682B4"  // Blue for first chart
        );
        
        update_scatter(
            results.data_groups[secondValue] || [], 
            chart2_svg, 
            chart2_scale, 
            "chart2-point", 
            "#A52A2A"  // Brown for second chart
        );
        
        // Add lines of best fit if they exist in the response
        if (results.best_fit_lines) {
            // Draw line of best fit for first facet
            if (results.best_fit_lines[firstValue]) {
                draw_line_of_best_fit(
                    chart1_svg, 
                    chart1_scale, 
                    results.best_fit_lines[firstValue],
                    "best-fit-1"
                );
            }
            
            // Draw line of best fit for second facet
            if (results.best_fit_lines[secondValue]) {
                draw_line_of_best_fit(
                    chart2_svg, 
                    chart2_scale, 
                    results.best_fit_lines[secondValue],
                    "best-fit-2"
                );
            }
        }
    }).catch(function(error) {
        console.error('Error updating data:', error);
    });
}

// Generate an array of tick values for a given range, aiming for a desired number of ticks. 
// Add extra tick marks at the start and end of the range to serve as padding.
function generatePaddedTicks(min, max, desiredNumTicks) {
    let chosenTickInterval;
    
    // Potential tick intervals
    const potentialIntervals = [0.1, 0.2, 0.5, 1, 2, 5];
    
    // Iterate through the potential intervals (in sorted, ascending order) to find the first (i.e., smallest)
    // interval size that results in less than or equal to 'desiredNumTicks' ticks. In other words, out of the
    // potential tick intervals, find the smallest interval size that results in less than or equal to
    // 'desiredNumTicks' ticks. 
    for (const interval of potentialIntervals) {
        if ((max - min) / interval <= desiredNumTicks) {
            chosenTickInterval = interval;
            break;
        }
    }
    // Generate ticks
    let ticks = [];
    // Start from 1 tick before the smallest multiple of chosenTickInterval that is greater than or equal to min
    // This adds padding at the bottom of the axis -- creates "visual margin" to ensure data points aren't directly
    // on the axis edges!
    let firstTick = Math.ceil(min / chosenTickInterval) * chosenTickInterval;
    let currentTick = firstTick - 1 * chosenTickInterval;  // Move back one extra tick

    // Continue until 1 extra ticks beyond max.
    // This adds padding at the top of the axis -- creates "visual margin" to ensure data points aren't directly on
    // the axis edges!
    while (currentTick <= max + 1 * chosenTickInterval) {
        ticks.push(currentTick);
        currentTick += chosenTickInterval;
    }
    return ticks;
}

// Initialize facet selector
function initializeFacetSelector() {
    const facetSelector = document.getElementById('facet-selector');
    if (facetSelector) {
        facetSelector.addEventListener('change', function() {
            update(chart1_svg, chart2_svg, chart1_scale, chart2_scale);
        });
    }
}

// Call this function when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the facet selector
    initializeFacetSelector();
    
    // Rest of your initialization code will be here
});
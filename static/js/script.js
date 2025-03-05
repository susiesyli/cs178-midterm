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

function draw_slider(column, min, max, placed_svg, not_placed_svg, placed_scale, not_placed_scale){
    slider = document.getElementById(column+'-slider')
    
    // If slider already has noUiSlider, destroy it first
    if (slider.noUiSlider) {
        slider.noUiSlider.destroy();
    }
    
    // Determine step size based on column name
    let stepSize;
    let tooltipsConfig;
    
    if (column === 'SoftSkillsRating') {
        // Use 0.1 step for SoftSkillsRating
        stepSize = 0.1;
        // Only show tooltip when slider is being used
        tooltipsConfig = true;
    } else {
        stepSize = 1;
        tooltipsConfig = true;
    }
    
    noUiSlider.create(slider, {
      start: [min, max],
      connect: true,
      tooltips: tooltipsConfig,
      step: stepSize,
      range: {'min': min, 'max': max}
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
        update(placed_svg, not_placed_svg, placed_scale, not_placed_scale)
    });
}

function draw_scatter(data, svg, scale, className, color){
    let dots = svg.selectAll("." + className)
        .data(data);
    
    // Remove old dots
    dots.exit().remove();
    
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

// Function that extracts the selected extracurricular activities and min/max values for sliders
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
    
    // Combine all parameters
    return {
        ...sliderParams,
        'ExtracurricularActivities': extracurricularValues,
        'PlacementTraining': placementTrainingValues,
        'x_axis': xAxis,
        'y_axis': yAxis
    };
}

function update_scatter(data, svg, scale, className, color){
    // Remove existing points
    svg.selectAll("." + className).remove();
    
    // Draw new points
    draw_scatter(data, svg, scale, className, color)
}

function update(placed_svg, not_placed_svg, placed_scale, not_placed_scale){
    params = get_params()
    fetch('/update', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(params),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())))
        update_scatter(results['placed_data'], placed_svg, placed_scale, "placed-point", "#4682B4") // Blue for placed
        update_scatter(results['not_placed_data'], not_placed_svg, not_placed_scale, "not-placed-point", "#A52A2A") // Brown for not placed
    })
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
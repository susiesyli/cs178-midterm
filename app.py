from flask import Flask, render_template, request
import duckdb
import numpy as np

app = Flask(__name__)
continuous_columns = ['Internships', 'Projects', 'AptitudeTestScore', 'SoftSkillsRating', 'SSC_Marks', 'HSC_Marks', 'CGPA']
discrete_columns = ['ExtracurricularActivities', 'PlacementTraining']
extracurricular_options = [True, False]
placement_training_options = ['Yes', 'No']
axis_options = ['CGPA', 'AptitudeTestScore', 'SoftSkillsRating', 'SSC_Marks', 'HSC_Marks']

@app.route('/')
def index():
    # Get ranges for all possible axis variables
    all_ranges = {}
    
    for column in axis_options:
        range_query = f'SELECT MIN({column}), MAX({column}) FROM placementdata.csv'
        range_results = duckdb.sql(range_query).df()
        
        # Get min and max values
        min_val = float(range_results.iloc[0, 0])
        max_val = float(range_results.iloc[0, 1])
        
        all_ranges[column] = [min_val, max_val]
    
    # Retrieves the minimum and maximum for filter sliders
    filter_ranges = {}
    
    for column in continuous_columns:
        range_query = f'SELECT MIN({column}), MAX({column}) FROM placementdata.csv'
        range_results = duckdb.sql(range_query).df()
        
        # Get min and max values
        min_val = range_results.iloc[0, 0]
        max_val = range_results.iloc[0, 1]
        
        # For SoftSkillsRating, keep decimal precision
        # For other columns, round to integers
        if column != 'SoftSkillsRating':
            min_val = int(min_val)
            max_val = int(max_val)
        else:
            # Round to 1 decimal place for SoftSkillsRating
            min_val = round(min_val, 1)
            max_val = round(max_val, 1)
            
        filter_ranges[column] = [min_val, max_val]

    return render_template(
        'index.html', 
        extracurricular_options=extracurricular_options,
        placement_training_options=placement_training_options,
        filter_ranges=filter_ranges,
        all_ranges=all_ranges,
        axis_options=axis_options
    )

@app.route('/update', methods=["POST"])
def update():
    request_data = request.get_json()

    # Get axis selections from request, with defaults
    x_axis = request_data.get('x_axis', 'AptitudeTestScore')
    y_axis = request_data.get('y_axis', 'CGPA')

    # Query template "continuous_predicate" converts the slider values to a where clause.
    continuous_predicate = ' AND '.join([f'({column} >= {request_data[column][0]} AND {column} <= {request_data[column][1]})' 
                                       for column in continuous_columns if column in request_data]) 
    
    # Query template "discrete_predicate" converts the checkbox values to a where clause.
    discrete_predicates = []
    
    # Handle ExtracurricularActivities filter
    extracurricular_values = request_data.get("ExtracurricularActivities", [])
    if not extracurricular_values:
        # If no extracurricular options are selected, return empty results
        return {'placed_data': [], 'not_placed_data': []}
    else:
        discrete_predicates.append(f'ExtracurricularActivities IN {tuple(extracurricular_values)}')
    
    # Handle PlacementTraining filter
    placement_training_values = request_data.get("PlacementTraining", [])
    if not placement_training_values:
        # If no placement training options are selected, return empty results
        return {'placed_data': [], 'not_placed_data': []}
    else:
        # Convert list to proper SQL format with quotes for string values
        values_str = ", ".join([f"'{val}'" for val in placement_training_values])
        discrete_predicates.append(f"PlacementTraining IN ({values_str})")
    
    discrete_predicate = ' AND '.join(discrete_predicates)

    # Combine where clause from sliders and checkboxes
    predicate = ' AND '.join([p for p in [continuous_predicate, discrete_predicate] if p])

    # Retrieve the filtered data for placed students.
    placed_query = f'SELECT {x_axis} as x, {y_axis} as y FROM placementdata.csv WHERE {predicate} AND PlacementStatus = \'Placed\''
    placed_results = duckdb.sql(placed_query).df()
    
    # "placed_data" contains the filtered data for placed students that will be used to update the first scatterplot.
    placed_data = [{'x': float(row['x']), 'y': float(row['y'])} for _, row in placed_results.iterrows()]

    # Retrieve the filtered data for not placed students.
    not_placed_query = f'SELECT {x_axis} as x, {y_axis} as y FROM placementdata.csv WHERE {predicate} AND PlacementStatus = \'NotPlaced\''
    not_placed_results = duckdb.sql(not_placed_query).df()
    
    # "not_placed_data" contains the filtered data for not placed students that will be used to update the second scatterplot.
    not_placed_data = [{'x': float(row['x']), 'y': float(row['y'])} for _, row in not_placed_results.iterrows()]

    return {'placed_data': placed_data, 'not_placed_data': not_placed_data}

if __name__ == "__main__":
    app.run(debug=True, port=7000)
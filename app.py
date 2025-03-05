from flask import Flask, render_template, request
import duckdb
import numpy as np

app = Flask(__name__)
continuous_columns = ['Internships', 'Projects', 'AptitudeTestScore', 'SoftSkillsRating', 'SSC_Marks', 'HSC_Marks', 'CGPA']
discrete_columns = ['ExtracurricularActivities', 'PlacementTraining']
extracurricular_options = ['Yes', 'No']
placement_training_options = ['Yes', 'No']
axis_options = ['CGPA', 'AptitudeTestScore', 'SoftSkillsRating', 'SSC_Marks', 'HSC_Marks']
# Add facet options
facet_options = {
    'PlacementStatus': ['Placed', 'NotPlaced'],
    'PlacementTraining': ['Yes', 'No'],
    'ExtracurricularActivities': ['Yes', 'No']
}

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
        axis_options=axis_options,
        facet_options=facet_options  # Pass facet options to template
    )

@app.route('/update', methods=["POST"])
def update():
    request_data = request.get_json()

    # Get axis selections from request, with defaults
    x_axis = request_data.get('x_axis', 'AptitudeTestScore')
    y_axis = request_data.get('y_axis', 'CGPA')
    
    # Get facet selection from request, default to PlacementStatus
    facet_column = request_data.get('facet_column', 'PlacementStatus')
    
    # Query template "continuous_predicate" converts the slider values to a where clause.
    continuous_predicate = ' AND '.join([f'({column} >= {request_data[column][0]} AND {column} <= {request_data[column][1]})' 
                                       for column in continuous_columns if column in request_data]) 
    
    # Query template "discrete_predicate" converts the checkbox values to a where clause.
    discrete_predicates = []
    
    # Handle ExtracurricularActivities filter
    extracurricular_values = request_data.get("ExtracurricularActivities", [])
    if not extracurricular_values:
        # If no extracurricular options are selected, return empty results
        return {'data_groups': {}, 'best_fit_lines': {}}
    else:
        discrete_predicates.append(f'ExtracurricularActivities IN {tuple(extracurricular_values)}')
    
    # Handle PlacementTraining filter
    placement_training_values = request_data.get("PlacementTraining", [])
    if not placement_training_values:
        # If no placement training options are selected, return empty results
        return {'data_groups': {}, 'best_fit_lines': {}}
    else:
        # Convert list to proper SQL format with quotes for string values
        values_str = ", ".join([f"'{val}'" for val in placement_training_values])
        discrete_predicates.append(f"PlacementTraining IN ({values_str})")
    
    discrete_predicate = ' AND '.join(discrete_predicates)

    # Combine where clause from sliders and checkboxes
    predicate = ' AND '.join([p for p in [continuous_predicate, discrete_predicate] if p])
    
    # Get possible values for the selected facet
    facet_values = facet_options[facet_column]
    
    # Initialize result dictionaries
    data_groups = {}
    best_fit_lines = {}
    
    # For each facet value, get the data
    for facet_value in facet_values:
        # Format facet_value for the query (strings need quotes)
        if isinstance(facet_value, str):
            formatted_facet_value = f"'{facet_value}'"
        else:
            formatted_facet_value = str(facet_value)
        
        # Create where clause
        where_clause = f"{facet_column} = {formatted_facet_value}"
        
        # Add predicate if it exists
        if predicate:
            where_clause = f"{where_clause} AND {predicate}"
        
        # Query for this facet value
        query = f'SELECT {x_axis} as x, {y_axis} as y FROM placementdata.csv WHERE {where_clause}'
        results = duckdb.sql(query).df()
        
        # Convert to list of points
        points = [{'x': float(row['x']), 'y': float(row['y'])} for _, row in results.iterrows()]
        
        # Add to result dictionary
        data_groups[str(facet_value)] = points
        
        # Calculate line of best fit if we have enough data points
        best_fit = None
        if results.shape[0] > 1:
            # Convert DataFrame columns to numpy arrays for polyfit
            x_values = results['x'].values.astype(float)
            y_values = results['y'].values.astype(float)
            
            coefficients = np.polyfit(x_values, y_values, 1)
            best_fit = {
                'slope': float(coefficients[0]),
                'intercept': float(coefficients[1]),
                'min_x': float(results['x'].min()),
                'max_x': float(results['x'].max())
            }
        
        # Add best fit line to results
        best_fit_lines[str(facet_value)] = best_fit

    return {
        'data_groups': data_groups,
        'best_fit_lines': best_fit_lines
    }

if __name__ == "__main__":
    app.run(debug=True, port=7000)
# PACU Flow Vision: User Tutorial

## 1. Getting Started

PACU Flow Vision is a simulation tool designed to model and optimize Post-Anesthesia Care Unit (PACU) workflows in hospital settings. This tutorial will guide you through using the application effectively.

### Application Overview

The application consists of several main sections:

- **Simulator**: The core simulation environment
- **Optimizer**: Tools to optimize surgery schedules
- **Scenarios**: Save and compare different simulation setups
- **Reports**: Generate and export reports of simulation results
- **Guide**: Help and information about the application

## 2. Setting Up Simulation Parameters

Before running a simulation, you need to configure the parameters:

1. Navigate to the **Simulator** tab
2. Select the **Parameters** sub-tab
3. Configure the following settings:

### Resource Settings

- **Beds**: Set the number of PACU beds (4-20)
- **Nurses per shift**: Set the number of nurses (2-15)
- **Nurse:patient ratio**: Set the ratio (1:1 to 1:4)
- **Simulation days**: Set the number of days to simulate (7-90)

### Patient Distribution

1. Go to the **Patient Distribution** tab
2. Adjust the sliders for each patient class to set their percentage of the total
3. Ensure the total adds up to 100% (the application will warn you if not)

### Nurse Settings

In the current version, nurse settings are simplified. The enhanced nurse model is under development and will be available in future versions. Currently, you can set:

1. **Nurses per shift**: The basic number of nurses set in the resource settings
2. **Nurse:patient ratio**: How many patients one nurse can care for

## 3. Creating OR Blocks

OR blocks represent scheduled time slots for specific types of surgeries in specific operating rooms:

1. Go to the **Salisuunnittelu** (OR Block Planning) tab
2. Click **Lisää blokki** (Add block) to create a new block
3. Configure each block:

   - Select the operating room
   - Choose the day of the week
   - Set start and end times
   - Select allowed patient classes/procedures
   - Give the block a descriptive name

4. Create multiple blocks to represent your hospital's typical OR schedule
5. Use the **Käytössä** (In use) toggle to enable/disable block scheduling

## 4. Generating Surgery Lists

After creating OR blocks, you can generate a surgery list:

1. From the OR blocks view, click **Generoi leikkauslista** (Generate surgery list)
2. Alternatively, go to the **Leikkauslista** (Surgery List) tab
3. Choose between:

   - **Template**: Automatically generate surgeries based on parameters
   - **Custom**: Manually create or modify the surgery list

4. For custom lists, you can:

   - Add individual surgeries
   - Import surgeries from data
   - Modify existing surgeries
   - Delete surgeries

5. Verify that surgeries align with your OR blocks (if using block scheduling)

## 5. Running Simulations

Once your parameters, blocks, and surgery list are configured:

1. Click **Aja simulaatio** (Run simulation) button
2. Wait for the simulation to complete (progress will be shown)
3. The results will appear in the results section below

### Important Tips:

- Ensure your patient distribution adds up to 100%
- If using block scheduling, make sure you've generated a surgery list
- Longer simulations (more days) provide more statistically reliable results
- Start with a simple configuration and gradually add complexity

## 6. Analyzing Results

After running a simulation, you can analyze the results:

1. Navigate through the results tabs:

   - **Tulokset** (Results): Key metrics and charts
   - **Leikkausaikataulu** (Surgery Schedule): Timeline of surgeries
   - **Saliblokit** (OR Blocks): Block utilization summary
   - **Gantt-kaavio** (Gantt Chart): Detailed timeline visualization

2. Key metrics to analyze:

   - **Keskimääräinen OR-odotusaika** (Average OR wait time)
   - **Keskimääräinen PACU-aika** (Average PACU time)
   - **Keskimääräinen osastosiirtoviive** (Average ward transfer delay)
   - **PACU-estoaika** (PACU blocking time)
   - **OR-käyttöaste** (OR utilization)
   - **Keskimääräinen käyttöaste** (Average utilization)

3. Use the charts to identify:
   - Bottlenecks in the process
   - Underutilized resources
   - Peak demand periods
   - Patient flow issues

## 7. Using the Optimizer

The optimizer helps find more efficient surgery schedules:

1. Go to the **Optimointi** (Optimization) tab
2. Configure optimization parameters:

   - **Alpha**: Weight for OR utilization
   - **Beta**: Weight for PACU blocking time
   - **Gamma**: Weight for ward transfer delays
   - **Maksimi-iteraatiot** (Maximum iterations): Higher values give better results but take longer
   - **Lämpötila** (Temperature): Starting temperature for simulated annealing
   - **Jäähdytysnopeus** (Cooling rate): How quickly the algorithm converges

3. Click **Käynnistä optimointi** (Start optimization)
4. Review the optimization results:
   - Initial score vs. best score
   - Percentage improvement
   - Click **Näytä optimoitu leikkauslista** (Show optimized surgery list) to see the new schedule

## 8. Managing Scenarios

Scenarios allow you to save and compare different simulation setups:

1. Go to the **Skenaariot** (Scenarios) tab
2. To save the current scenario:

   - Enter a name and description
   - Add tags for easier filtering
   - Click **Tallenna skenaario** (Save scenario)

3. To load a saved scenario:

   - Browse the list of saved scenarios
   - Click on a scenario to view details
   - Click **Lataa skenaario** (Load scenario) to apply it

4. To compare scenarios:
   - Select multiple scenarios using checkboxes
   - Click **Vertaile valittuja** (Compare selected)
   - Review the comparison charts and tables

## 9. Exporting Reports

To share or document your simulation results:

1. Go to the **Raportit** (Reports) tab
2. Configure your report:

   - Select which metrics to include
   - Choose which charts to include
   - Add comments or notes

3. Export options:
   - **Vie CSV:nä** (Export as CSV): For further analysis in Excel
   - **Vie PDF:nä** (Export as PDF): For presentations and documentation
   - **Tulosta** (Print): Send directly to printer

## 10. Troubleshooting

### Common Issues and Solutions:

#### Empty Simulation Results

If your simulation shows zeros for all metrics:

- Ensure you've generated a surgery list
- Check that your OR blocks are properly configured
- Verify that patient distribution adds up to 100%
- Increase the number of simulation days

#### Long Simulation Times

If simulations take too long:

- Reduce the number of simulation days
- Simplify your OR block configuration
- Reduce the number of patient classes
- Close other applications to free up resources

#### Unrealistic Results

If results don't match expectations:

- Verify your input parameters against real-world data
- Check patient class settings (surgery durations, PACU times)
- Ensure nurse staffing levels are realistic
- Adjust the nurse-patient ratio to match your facility

#### Optimization Not Improving

If optimization shows minimal improvement:

- Increase the maximum iterations
- Adjust the weights (alpha, beta, gamma)
- Increase the initial temperature
- Decrease the cooling rate
- Ensure your initial schedule has room for improvement

## Conclusion

PACU Flow Vision is a powerful tool for modeling and optimizing hospital workflows. By following this tutorial, you should be able to create realistic simulations, identify bottlenecks, and optimize your resources for better patient care and operational efficiency.

Remember that simulation results are only as good as the input data. Take time to calibrate your parameters based on real-world observations to get the most accurate and useful results.

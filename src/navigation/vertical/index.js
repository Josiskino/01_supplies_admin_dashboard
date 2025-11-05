import appsAndPages from './apps-and-pages'
import charts from './charts'
import dashboard from './dashboard'
import forms from './forms'
import others from './others'
import uiElements from './ui-elements'

// Export all nav items (filtering will be done in the layout component)
export default [...dashboard, ...appsAndPages, ...uiElements, ...forms, ...charts, ...others]

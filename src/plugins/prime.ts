import { App } from 'vue';

// Import các Component bạn cần
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import 'primeicons/primeicons.css';

export default {
    install: (app: App) => {
        app.component('DataTable', DataTable);
        app.component('Column', Column);
        app.component('InputText', InputText);
        app.component('IconField', IconField);
        app.component('InputIcon', InputIcon);
        app.component('Tag', Tag);
        app.component('Select', Select);
        app.component('MultiSelect', MultiSelect);
        app.component('Checkbox', Checkbox);
        app.component('DatePicker', DatePicker);
        app.component('Button', Button);
    }
};
import { App } from 'vue';

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
import RadioButton from 'primevue/radiobutton';
import Skeleton from 'primevue/skeleton';
import InputNumber from 'primevue/inputnumber';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import AppToast from '@/components/AppToast.vue';

import 'primeicons/primeicons.css';

export default {
    install: (app: App) => {
        app.component('DataTable', DataTable);
        app.component('Column', Column);
        app.component('MultiSelect', MultiSelect);
        app.component('InputText', InputText);
        app.component('IconField', IconField);
        app.component('InputIcon', InputIcon);
        app.component('Tag', Tag);
        app.component('Select', Select);
        app.component('MultiSelect', MultiSelect);
        app.component('Checkbox', Checkbox);
        app.component('DatePicker', DatePicker);
        app.component('Button', Button);
        app.component('RadioButton', RadioButton);
        app.component('Skeleton', Skeleton);
        app.component('InputNumber', InputNumber);
        app.component('Dialog', Dialog);
        app.component('Toast', Toast);
        app.component('AppToast', AppToast);
    }
};
// Define the menu structure for your application
// This is a sample menu structure - adjust it based on your application's navigation needs

const menuItems = {
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'group',
        icon: null,
        children: [
          {
            id: 'default',
            title: 'Dashboard',
            type: 'item',
            url: '/dashboard',
            icon: null,
            breadcrumbs: false
          }
        ]
      },
      {
        id: 'pages',
        title: 'Pages',
        caption: 'Predefined pages',
        type: 'group',
        icon: null,
        children: [
          {
            id: 'auth',
            title: 'Authentication',
            type: 'collapse',
            icon: null,
            children: [
              {
                id: 'login',
                title: 'Login',
                type: 'item',
                url: '/login',
                target: false
              },
              {
                id: 'register',
                title: 'Register',
                type: 'item',
                url: '/register',
                target: false
              }
            ]
          }
        ]
      }
    ]
  };
  
  export default menuItems;
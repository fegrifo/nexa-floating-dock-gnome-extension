import GLib from 'gi://GLib';

export const LANGUAGE_OPTIONS = [
    { id: 'auto', labelKey: 'lang_auto' },
    { id: 'en', labelKey: 'lang_en' },
    { id: 'pt_BR', labelKey: 'lang_pt_BR' },
    { id: 'es', labelKey: 'lang_es' },
];

const TRANSLATIONS = {
    en: {
        lang_auto: 'Auto (System)',
        lang_en: 'English',
        lang_pt_BR: 'Português (Brasil)',
        lang_es: 'Español',

        // Pages
        page_appearance: 'Appearance',
        page_controls: 'Controls',
        page_behavior: 'Behavior & Apps',

        // Appearance -> Dock Bar
        group_dock_bar: 'Dock Bar',
        group_dock_bar_desc: 'Background blur, transparency, and corner rounding',
        blur_enabled_title: 'Background Blur',
        blur_enabled_sub: 'Apply frosted glass blur behind the dock',
        blur_radius_title: 'Blur Intensity',
        blur_radius_sub: 'Blur radius in pixels',
        bg_opacity_title: 'Background Opacity (%)',
        bg_opacity_sub: '0% transparent to 100% solid',
        border_radius_title: 'Corner Radius (px)',

        // Appearance -> Icons & Accent
        group_icons: 'Icons & Accent Color',
        icon_size_title: 'Icon Size',
        hover_lift_title: 'Hover Lift Height (px)',
        hover_lift_sub: 'How high icons rise when hovered (0 to disable)',
        accent_color_title: 'Accent Color',
        accent_color_sub: 'Shared by running indicators, radial icons, and the Super icon',
        color_white: 'White (Default)',
        color_blue: 'GNOME Blue',
        color_purple: 'Purple',
        color_green: 'Green',
        color_orange: 'Orange',
        color_pink: 'Red / Pink',
        color_custom: 'Custom',

        // Appearance -> Running Indicator
        group_indicator: 'Running App Indicator',
        indicator_style_title: 'Indicator Style',
        indicator_dash: 'Dash (Pill)',
        indicator_dot: 'Dot',
        indicator_pos_title: 'Indicator Position',
        pos_bottom: 'Bottom',
        pos_left: 'Left',

        // Controls
        group_actions: 'Control Button Actions',
        group_actions_desc: 'Customize what each mouse or touch interaction on the Super button does',
        action_left_click: 'Single Left Click',
        action_double_click: 'Double Left Click',
        action_right_click: 'Right Click',
        action_overview: 'Open Super / App Grid',
        action_toggle_dock: 'Expand / Collapse Dock',
        action_radial_menu: 'Open Radial Menu',
        action_none: 'Disabled',
        long_press_title: 'Long Press / Touch Hold (500ms)',
        long_press_sub: 'Hold left click, finger, or stylus to trigger the Right Click action',

        group_gestures: 'Built-in Gestures',
        group_gestures_desc: 'Other interactions always available on the Super button',
        gesture_drag_title: 'Click and Drag',
        gesture_drag_sub: 'Click and drag the Super button to move the floating dock anywhere on screen',
        gesture_scroll_title: 'Mouse Scroll Wheel',
        gesture_scroll_sub: 'Scroll up or down over the Super button to switch workspaces',
        gesture_outside_title: 'Click Outside Radial Menu',
        gesture_outside_sub: 'Closes the radial menu and restores the dock to its previous state',

        // Behavior & Apps
        group_behavior: 'Behavior',
        language_title: 'Language',
        language_sub: 'Language for settings and radial menu tooltips',
        direction_title: 'Expand Direction',
        dir_up: 'Up',
        dir_down: 'Down',
        dir_left: 'Left',
        dir_right: 'Right',
        keep_open_title: 'Keep Dock Expanded',
        keep_open_sub: 'Also toggled by double-clicking the Super button',
        current_ws_title: 'Current Workspace Applications Only',
        group_apps: 'Applications',
        use_favorites_title: 'Use System Favorite Applications',

        // Radial menu tooltips
        tooltip_lock: 'Lock Screen',
        tooltip_logout: 'Log Out',
        tooltip_suspend: 'Suspend',
        tooltip_power: 'Power Off',
        tooltip_up: 'Expand Up',
        tooltip_down: 'Expand Down',
        tooltip_right: 'Expand Right',
        tooltip_left: 'Expand Left',
    },

    pt_BR: {
        lang_auto: 'Automático (Sistema)',
        lang_en: 'English',
        lang_pt_BR: 'Português (Brasil)',
        lang_es: 'Español',

        // Pages
        page_appearance: 'Aparência',
        page_controls: 'Controles',
        page_behavior: 'Comportamento & Apps',

        // Appearance -> Dock Bar
        group_dock_bar: 'Barra da Dock',
        group_dock_bar_desc: 'Desfoque de fundo, transparência e arredondamento dos cantos',
        blur_enabled_title: 'Desfoque de Fundo (Blur)',
        blur_enabled_sub: 'Aplica efeito de vidro fosco atrás da barra',
        blur_radius_title: 'Intensidade do Desfoque',
        blur_radius_sub: 'Raio do blur em pixels',
        bg_opacity_title: 'Opacidade do Fundo (%)',
        bg_opacity_sub: '0% transparente até 100% sólido',
        border_radius_title: 'Arredondamento dos Cantos (px)',

        // Appearance -> Icons & Accent
        group_icons: 'Ícones & Cor de Destaque',
        icon_size_title: 'Tamanho dos Ícones',
        hover_lift_title: 'Altura da Subida no Hover (px)',
        hover_lift_sub: 'O quanto o ícone sobe ao passar o mouse (0 para desativar)',
        accent_color_title: 'Cor de Destaque',
        accent_color_sub: 'Compartilhada pelos indicadores, ícones da roleta e botão Super',
        color_white: 'Branco (Padrão)',
        color_blue: 'Azul GNOME',
        color_purple: 'Roxo',
        color_green: 'Verde',
        color_orange: 'Laranja',
        color_pink: 'Vermelho / Rosa',
        color_custom: 'Personalizada',

        // Appearance -> Running Indicator
        group_indicator: 'Indicador de App Aberto',
        indicator_style_title: 'Estilo do Indicador',
        indicator_dash: 'Barra (Pílula)',
        indicator_dot: 'Ponto',
        indicator_pos_title: 'Posição do Indicador',
        pos_bottom: 'Embaixo',
        pos_left: 'Esquerda',

        // Controls
        group_actions: 'Ações do Botão de Controle',
        group_actions_desc: 'Personalize o que cada interação de mouse ou toque no botão Super faz',
        action_left_click: 'Clique Esquerdo Simples',
        action_double_click: 'Clique Esquerdo Duplo',
        action_right_click: 'Clique Direito',
        action_overview: 'Abrir Super / Grade de Apps',
        action_toggle_dock: 'Recolher / Expandir Barra',
        action_radial_menu: 'Abrir Roleta de Ações',
        action_none: 'Desativado',
        long_press_title: 'Pressionar e Segurar (500ms)',
        long_press_sub: 'Segurar o clique esquerdo, dedo ou caneta aciona a ação do Clique Direito',

        group_gestures: 'Gestos Integrados',
        group_gestures_desc: 'Outras interações sempre disponíveis no botão Super',
        gesture_drag_title: 'Clicar e Arrastar',
        gesture_drag_sub: 'Clique e arraste o botão Super para mover a barra flutuante pela tela',
        gesture_scroll_title: 'Rodinha do Mouse',
        gesture_scroll_sub: 'Role para cima ou para baixo sobre o botão Super para trocar de área de trabalho',
        gesture_outside_title: 'Clicar Fora da Roleta',
        gesture_outside_sub: 'Fecha a roleta de ações e restaura o estado anterior da barra',

        // Behavior & Apps
        group_behavior: 'Comportamento',
        language_title: 'Idioma',
        language_sub: 'Idioma das configurações e das legendas da roleta',
        direction_title: 'Direção de Expansão',
        dir_up: 'Para cima',
        dir_down: 'Para baixo',
        dir_left: 'Para a esquerda',
        dir_right: 'Para a direita',
        keep_open_title: 'Manter Barra Expandida',
        keep_open_sub: 'Também alternado com dois cliques no botão Super',
        current_ws_title: 'Apenas Apps da Área de Trabalho Atual',
        group_apps: 'Aplicativos',
        use_favorites_title: 'Usar Favoritos do Sistema',

        // Radial menu tooltips
        tooltip_lock: 'Bloquear Tela',
        tooltip_logout: 'Encerrar Sessão',
        tooltip_suspend: 'Suspender',
        tooltip_power: 'Desligar',
        tooltip_up: 'Expandir para Cima',
        tooltip_down: 'Expandir para Baixo',
        tooltip_right: 'Expandir para a Direita',
        tooltip_left: 'Expandir para a Esquerda',
    },

    es: {
        lang_auto: 'Automático (Sistema)',
        lang_en: 'English',
        lang_pt_BR: 'Português (Brasil)',
        lang_es: 'Español',

        // Pages
        page_appearance: 'Apariencia',
        page_controls: 'Controles',
        page_behavior: 'Comportamiento & Apps',

        // Appearance -> Dock Bar
        group_dock_bar: 'Barra del Dock',
        group_dock_bar_desc: 'Desenfoque de fondo, transparencia y bordes redondeados',
        blur_enabled_title: 'Desenfoque de Fondo (Blur)',
        blur_enabled_sub: 'Aplica efecto de vidrio esmerilado detrás de la barra',
        blur_radius_title: 'Intensidad del Desenfoque',
        blur_radius_sub: 'Radio del desenfoque en píxeles',
        bg_opacity_title: 'Opacidad del Fondo (%)',
        bg_opacity_sub: '0% transparente hasta 100% sólido',
        border_radius_title: 'Radio de las Esquinas (px)',

        // Appearance -> Icons & Accent
        group_icons: 'Iconos & Color de Acento',
        icon_size_title: 'Tamaño de los Iconos',
        hover_lift_title: 'Altura al Pasar el Ratón (px)',
        hover_lift_sub: 'Cuánto suben los iconos al pasar el ratón (0 para desactivar)',
        accent_color_title: 'Color de Acento',
        accent_color_sub: 'Compartido por los indicadores, iconos radiales y el botón Super',
        color_white: 'Blanco (Predeterminado)',
        color_blue: 'Azul GNOME',
        color_purple: 'Morado',
        color_green: 'Verde',
        color_orange: 'Naranja',
        color_pink: 'Rojo / Rosa',
        color_custom: 'Personalizado',

        // Appearance -> Running Indicator
        group_indicator: 'Indicador de App Abierta',
        indicator_style_title: 'Estilo del Indicador',
        indicator_dash: 'Barra (Píldora)',
        indicator_dot: 'Punto',
        indicator_pos_title: 'Posición del Indicador',
        pos_bottom: 'Abajo',
        pos_left: 'Izquierda',

        // Controls
        group_actions: 'Acciones del Botón de Control',
        group_actions_desc: 'Personaliza lo que hace cada interacción con el botón Super',
        action_left_click: 'Clic Izquierdo Simple',
        action_double_click: 'Doble Clic Izquierdo',
        action_right_click: 'Clic Derecho',
        action_overview: 'Abrir Super / Cuadrícula de Apps',
        action_toggle_dock: 'Contraer / Expandir Barra',
        action_radial_menu: 'Abrir Menú Radial',
        action_none: 'Desactivado',
        long_press_title: 'Pulsación Larga / Táctil (500ms)',
        long_press_sub: 'Mantener el clic izquierdo, dedo o lápiz activa la acción de Clic Derecho',

        group_gestures: 'Gestos Integrados',
        group_gestures_desc: 'Otras interacciones siempre disponibles en el botón Super',
        gesture_drag_title: 'Clic y Arrastrar',
        gesture_drag_sub: 'Haz clic y arrastra el botón Super para mover la barra flotante por la pantalla',
        gesture_scroll_title: 'Rueda del Ratón',
        gesture_scroll_sub: 'Desplaza arriba o abajo sobre el botón Super para cambiar de área de trabajo',
        gesture_outside_title: 'Clic Fuera del Menú Radial',
        gesture_outside_sub: 'Cierra el menú radial y restaura el estado anterior de la barra',

        // Behavior & Apps
        group_behavior: 'Comportamiento',
        language_title: 'Idioma',
        language_sub: 'Idioma de la configuración y de las etiquetas del menú radial',
        direction_title: 'Dirección de Expansión',
        dir_up: 'Arriba',
        dir_down: 'Abajo',
        dir_left: 'Izquierda',
        dir_right: 'Derecha',
        keep_open_title: 'Mantener Barra Expandida',
        keep_open_sub: 'También se alterna con doble clic en el botón Super',
        current_ws_title: 'Solo Apps del Área de Trabajo Actual',
        group_apps: 'Aplicaciones',
        use_favorites_title: 'Usar Aplicaciones Favoritas del Sistema',

        // Radial menu tooltips
        tooltip_lock: 'Bloquear Pantalla',
        tooltip_logout: 'Cerrar Sesión',
        tooltip_suspend: 'Suspender',
        tooltip_power: 'Apagar',
        tooltip_up: 'Expandir Hacia Arriba',
        tooltip_down: 'Expandir Hacia Abajo',
        tooltip_right: 'Expandir a la Derecha',
        tooltip_left: 'Expandir a la Izquierda',
    },
};

export function resolveLanguage(settingValue) {
    if (settingValue && settingValue !== 'auto' && TRANSLATIONS[settingValue])
        return settingValue;

    const langs = GLib.get_language_names();
    for (const lang of langs) {
        const lower = lang.toLowerCase();
        if (lower.startsWith('pt'))
            return 'pt_BR';
        if (lower.startsWith('es'))
            return 'es';
        if (lower.startsWith('en'))
            return 'en';
    }
    return 'en';
}

export function getTranslator(settings) {
    const lang = resolveLanguage(settings.get_string('floating-dock-language'));
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return key => dict[key] || TRANSLATIONS.en[key] || key;
}

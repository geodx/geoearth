import { InfoBoxViewModel, Viewer, InfoBox as CesiumInfoBox } from 'cesium';

class InfoBox {
  public viewModel: InfoBoxViewModel;

  constructor(viewer: Viewer) {
    const infoBoxContainer = document.createElement('div');
    infoBoxContainer.className = 'cesium-viewer-infoBoxContainer';
    viewer.container.appendChild(infoBoxContainer);
    const infoBox = new CesiumInfoBox(infoBoxContainer);

    const dom: HTMLDivElement | null = document.querySelector('.cesium-infoBox');
    if (dom) {
      dom.style.top = '105px';
    }

    infoBox.viewModel.closeClicked.addEventListener(() => {
      infoBox.viewModel.showInfo = false;
    });
    this.viewModel = infoBox.viewModel;
  }
}


export { InfoBox };

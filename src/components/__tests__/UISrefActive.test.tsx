import * as React from 'react';
import { mount } from 'enzyme';
import { makeTestRouter } from '../../__tests__/util';
import { ReactStateDeclaration } from '../../index';
import { UISref, UISrefActive, UIRouter } from '../../components';

const states: ReactStateDeclaration[] = [
  { name: 'parent', url: '/parent' },
  { name: 'parent.child1', url: '/child1' },
  { name: 'parent.child2', url: '/child2' },
  { name: 'withParams', url: '/with?param' },
];

describe('<UISrefActive>', () => {
  let { router, routerGo, mountInRouter } = makeTestRouter([]);
  beforeEach(() => ({ router, routerGo, mountInRouter } = makeTestRouter(states)));
  beforeAll(() => jest.spyOn(React, 'useEffect').mockImplementation(React.useLayoutEffect));
  afterAll(() => (React.useEffect as any).mockRestore());

  function UISrefActiveTestComponent(props: { to?: string; activeClass?: string; params?: object; exact?: boolean }) {
    const { to = 'parent', activeClass = 'active', exact = false, params } = props;
    return (
      <UISrefActive class={activeClass} exact={exact}>
        <UISref to={to} params={params}>
          <a />
        </UISref>
      </UISrefActive>
    );
  }

  it('renders its child', async () => {
    const wrapper = mountInRouter(<UISrefActiveTestComponent to="parent.child1" />);
    const props = wrapper.find('a').props();
    expect(typeof props.onClick).toBe('function');
    expect(props.href).toBe('/parent/child1');
  });

  it('updates class for child <UISref>', async () => {
    const wrapper = mountInRouter(<UISrefActiveTestComponent to="parent.child1" />);
    expect(wrapper.find('a')).toHaveLength(1);
    expect(wrapper.find('a').props().className).toBe('');

    await routerGo('parent.child1');
    wrapper.update();
    expect(wrapper.find('a')).toHaveLength(1);
    expect(wrapper.find('a').props().className).toBe('active');

    await routerGo('parent.child2');
    wrapper.update();
    expect(wrapper.find('a')).toHaveLength(1);
    expect(wrapper.find('a').props().className).toBe('');
  });

  it('registers onSuccess transition hook to listen for state changes', async () => {
    const onSuccessSpy = jest.spyOn(router.transitionService, 'onSuccess');
    mountInRouter(<UISrefActiveTestComponent />);
    expect(onSuccessSpy).toHaveBeenCalled();
  });

  it('deregisters the transition hook when unmounted', async () => {
    const deregisterSpy = jest.fn();
    jest.spyOn(router.transitionService, 'onSuccess').mockImplementation(() => deregisterSpy);

    const wrapper = mountInRouter(<UISrefActive />);
    expect(deregisterSpy).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(deregisterSpy).toHaveBeenCalled();
  });

  it('works with state parameters', async () => {
    await routerGo('withParams', { param: 5 });
    const wrapper = mountInRouter(<UISrefActiveTestComponent to="withParams" params={{ param: 5 }} />);
    expect(wrapper.find('a').props().className).toBe('active');

    await routerGo('withParams', { param: 3 });
    wrapper.update();
    expect(wrapper.find('a').props().className).toBe('');
  });

  it('applies the active class when any nested <UISref> is active', async () => {
    const wrapper = mountInRouter(
      <UISrefActive class="active">
        <div>
          <UISref to="parent.child1">
            <a>child1</a>
          </UISref>
          <UISref to="parent.child2">
            <a>child2</a>
          </UISref>
        </div>
      </UISrefActive>
    );
    await routerGo('parent.child1');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(1);

    await routerGo('parent.child2');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(1);

    await routerGo('parent.child2');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(1);

    await routerGo('parent');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(0);
  });

  it('works with nested <UISrefActive>', async () => {
    const wrapper = mountInRouter(
      <UISrefActive class="active">
        <div>
          <UISrefActive class="child1">
            <UISref to="parent.child1">
              <a>child1</a>
            </UISref>
          </UISrefActive>
          <UISrefActive class="child2">
            <UISref to="parent.child2">
              <a>child2</a>
            </UISref>
          </UISrefActive>
        </div>
      </UISrefActive>
    );

    await routerGo('parent');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(0);
    expect(wrapper.find('a.child1')).toHaveLength(0);
    expect(wrapper.find('a.child2')).toHaveLength(0);

    await routerGo('parent.child1');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(1);
    expect(wrapper.find('a.child1')).toHaveLength(1);
    expect(wrapper.find('a.child2')).toHaveLength(0);

    await routerGo('parent.child2');
    wrapper.update();
    expect(wrapper.find('div.active')).toHaveLength(1);
    expect(wrapper.find('a.child1')).toHaveLength(0);
    expect(wrapper.find('a.child2')).toHaveLength(1);
  });

  it('passes down className from parent correctly', async () => {
    const wrapper = mountInRouter(
      <UISrefActive class="active">
        <UISrefActive class="child1">
          <UISref to="parent.child1">
            <a>child1</a>
          </UISref>
        </UISrefActive>
      </UISrefActive>
    );

    await routerGo('parent.child1');
    wrapper.update();
    expect(wrapper.find('a.active.child1')).toHaveLength(1);

    await routerGo('parent');
    wrapper.update();
    expect(wrapper.find('a.active')).toHaveLength(0);
    expect(wrapper.find('a.child1')).toHaveLength(0);
  });

  it('removes active state if underlying UISref is unmounted', async () => {
    const Comp = ({ show }) => {
      const sref = (
        <UISref to="parent.child1">
          <a>child1</a>
        </UISref>
      );

      return (
        <UIRouter router={router}>
          <UISrefActive class="active">{show ? sref : <div id="test" />}</UISrefActive>
        </UIRouter>
      );
    };

    await routerGo('parent.child1');
    const wrapper = mount(<Comp show={true} />);
    const activeLink = wrapper.find('a.active');
    expect(activeLink).toHaveLength(1);

    wrapper.setProps({ show: false });
    expect(wrapper.html()).toBe('<div id="test"></div>');
  });

  it('checks for exact state match when exact prop is provided', async () => {
    const wrapper = mountInRouter(
      <>
        <UISrefActiveTestComponent activeClass="fuzzy" to="parent" />
        <UISrefActiveTestComponent activeClass="exact" to="parent" exact={true} />
      </>
    );
    await routerGo('parent.child1');
    wrapper.update();
    expect(wrapper.find('a.fuzzy')).toHaveLength(1);
    expect(wrapper.find('a.exact')).toHaveLength(0);

    await routerGo('parent');
    wrapper.update();
    expect(wrapper.find('a.fuzzy')).toHaveLength(1);
    expect(wrapper.find('a.exact')).toHaveLength(1);
  });
});

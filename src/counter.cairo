#[starknet::interface]
trait ICounter <TContractState> {
    fn get_counter(self: @TContractState) -> u32;
    fn increase_counter(ref self: TContractState);
}

#[starknet::contract]
mod Counter {
    use kill_switch::{IKillSwitchDispatcher, IKillSwitchDispatcherTrait};
    use starknet::ContractAddress;
    use openzeppelin::access::ownable::OwnableComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent );


    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;

    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    

    #[storage]
    struct Storage {
        counter: u32,
        kill_switch: IKillSwitchDispatcher,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CounterIncreased : CounterIncreased,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    struct CounterIncreased {
        #[key]
        counter : u32,
    }

    #[constructor]
    fn constructor(ref self: ContractState, initial_counter: u32, kill_switch_address: ContractAddress, initial_owner: ContractAddress) {
        self.counter.write(initial_counter);
        let dispatcher = IKillSwitchDispatcher {contract_address: kill_switch_address }; 
        self.kill_switch.write(dispatcher);
        self.ownable.initializer(initial_owner);
    }

    #[abi(embed_v0)]
    impl ICounterImpl of super::ICounter<ContractState> {
        fn get_counter(self: @ContractState) -> u32 {
            self.counter.read()
        }

        fn increase_counter(ref self: ContractState) {
            self.ownable.assert_only_owner();
            let dispatcher = self.kill_switch.read();
            assert!(dispatcher.is_active() == false, "Kill Switch is active");
            let old_count = self.counter.read();
            let new_count = old_count + 1;
            self.counter.write(new_count);
            let event = CounterIncreased {
                counter: old_count,
            };
            self.emit(Event::CounterIncreased(event));
        }
    }
}